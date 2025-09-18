// app/api/secure/route.js
import arcjet, { shield, detectBot } from "@arcjet/next";

const aj = arcjet({
  key: process.env.ARCJET_KEY, // ✅ no "!"
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({ mode: "LIVE", allow: ["CATEGORY:SEARCH_ENGINE"] }),
  ],
});

export async function GET(req) {
  try {
    const result = await aj.protect(req);
    console.log("Arcjet result:", result); // ✅ Debug

    if (result.isDenied()) {
      return new Response(
        JSON.stringify({ error: `Blocked by Arcjet: ${result.reason}` }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Arcjet error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
