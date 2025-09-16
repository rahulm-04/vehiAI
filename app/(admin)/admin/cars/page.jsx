import React from 'react'
import { CarsList } from './_components/car-list'



export const metadata = {
    title:"cars| Vehiql Admin",
    description: "Manage cars in your marketplace",
}

const CarsPage = () => {
  return (
    <div>
       <h1 className='text-2xl font-bold mb-6'> Cars Mangement</h1>
       <CarsList/>
    </div>
  )
}

export default CarsPage
