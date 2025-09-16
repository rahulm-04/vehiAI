"use server"

import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { serializeCarData } from "@/lib/helper";
import { success } from "zod";
import { Select } from "react-day-picker";

// Convert file to base64
async function fileToBase64(file) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  return buffer.toString("base64");
}

export async function processCarImageWithAI(file) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Gemini API key is not configured");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const base64Image = await fileToBase64(file);

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: file.type,
      },
    };

    const prompt = `
      Analyze this car image and extract details...
      (same JSON schema you wrote)
    `;

    const result = await model.generateContent([imagePart, prompt]);
    const response = await result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    try {
      const carDetails = JSON.parse(cleanedText);

      const requiredFields = [
        "make",
        "model",
        "year",
        "color",
        "bodyType",
        "price",
        "mileage",
        "fuelType",
        "transmission",
        "description",
        "confidence",
      ];

      const missingFields = requiredFields.filter(
        (field) => !(field in carDetails)
      );

      if (missingFields.length > 0) {
        throw new Error(
          `AI response missing required fields: ${missingFields.join(", ")}`
        );
      }

      return { success: true, data: carDetails };
    } catch (error) {
      console.error("Failed to parse AI response:", error); // ✅ fixed
      return { success: false, error: "Failed to parse AI response" };
    }
  } catch (error) {
    throw new Error("Gemini API Error: " + error.message);
  }
}

export async function addCar({ carData, images }) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });
    if (!user) throw new Error("User not found");

    const carId = uuidv4();
    const folderPath = `cars/${carId}`;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const imageUrls = [];

    for (let i = 0; i < images.length; i++) {
      const base64Data = images[i];

      // ✅ Correct validation
      if (!base64Data || !base64Data.startsWith("data:image/")) {
        console.warn("Skipping invalid image data");
        continue;
      }

      // ✅ Extract base64 and extension
      const base64 = base64Data.split(",")[1];
      const imageBuffer = Buffer.from(base64, "base64");

      const mimeMatch = base64Data.match(/data:image\/([a-zA-Z0-9]+);/);
      const fileExtension = mimeMatch ? mimeMatch[1] : "jpeg";

      const fileName = `image-${Date.now()}-${i}.${fileExtension}`;
      const filePath = `${folderPath}/${fileName}`;

      //  Upload to Supabase
      const { error } = await supabase.storage
        .from("car-images")
        .upload(filePath, imageBuffer, {
          contentType: `image/${fileExtension}`, 
        });

      if (error) {
        console.error("Error uploading image:", error);
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("car-images")
        .getPublicUrl(filePath);

      imageUrls.push(publicUrlData.publicUrl);
    }

    if (imageUrls.length === 0) {
      throw new Error("No valid images were uploaded");
    }

    const car = await db.car.create({
      data: {
        id: carId,
        make: carData.make,
        model: carData.model,
        year: carData.year,
        price: carData.price,
        mileage: carData.mileage,
        color: carData.color,
        fuelType: carData.fuelType,
        transmission: carData.transmission,
        bodyType: carData.bodyType,
        seats: carData.seats,
        description: carData.description,
        status: carData.status,
        featured: carData.featured,
        images: imageUrls,
      },
    });

   

   // Revalidate the cars list page
    revalidatePath("/admin/cars");

    return {
      success: true,
    };
  } catch (error) {
    throw new Error("Error adding car:" + error.message);
  }
}

// Fetch all cars with simple search
export async function getCars(search = "") {
  try {
    // Build where conditions
    let where = {};

    // Add search filter
    if (search) {
      where.OR = [
        { make: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        { color: { contains: search, mode: "insensitive" } },
      ];
    }

    // Execute main query
    const cars = await db.car.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const serializedCars = cars.map(serializeCarData);

    return {
      success: true,
      data: serializedCars,
    };
  } catch (error) {
    console.error("Error fetching cars:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Delete a car by ID
export async function deleteCar(id) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // First, fetch the car to get its images
    const car = await db.car.findUnique({
      where: { id },
      select: { images: true },
    });

    if (!car) {
      return {
        success: false,
        error: "Car not found",
      };
    }

    // Delete the car from the database
    await db.car.delete({
      where: { id },
    });

    // Delete the images from Supabase storage
    try {
      const cookieStore = cookies();
      const supabase = createClient(cookieStore);

      // Extract file paths from image URLs
      const filePaths = car.images
        .map((imageUrl) => {
          const url = new URL(imageUrl);
          const pathMatch = url.pathname.match(/\/car-images\/(.*)/);
          return pathMatch ? pathMatch[1] : null;
        })
        .filter(Boolean);

      // Delete files from storage if paths were extracted
      if (filePaths.length > 0) {
        const { error } = await supabase.storage
          .from("car-images")
          .remove(filePaths);

        if (error) {
          console.error("Error deleting images:", error);
          // We continue even if image deletion fails
        }
      }
    } catch (storageError) {
      console.error("Error with storage operations:", storageError);
      // Continue with the function even if storage operations fail
    }

    // Revalidate the cars list page
    revalidatePath("/admin/cars");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting car:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Update car status or featured status
export async function updateCarStatus(id, { status, featured }) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const updateData = {};

    if (status !== undefined) {
      updateData.status = status;
    }

    if (featured !== undefined) {
      updateData.featured = featured;
    }

    // Update the car
    await db.car.update({
      where: { id },
      data: updateData,
    });

    // Revalidate the cars list page
    revalidatePath("/admin/cars");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error updating car status:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}