import { getAdmin } from '@/actions/admin';
import Header from '@/components/Header'
import { notFound } from "next/navigation";
import React from 'react'
import { Sidebar } from './_Components/Sidebar';



const AdminLayout = async({children}) => {
    const admin = await getAdmin()

   if(!admin.authorized){
    return notFound()
   }

  return(
     <div className='h-full'>
    <Header isAdminPage={true}/>
    <div className='fixed top-20 left-0 w-56 h-[calc(100%-80px)] z-30'>
      <Sidebar/>
    </div>
    <main className='pl-56 pt-[80px] h-full'>{children}</main>
  </div>
  )
}

export default AdminLayout