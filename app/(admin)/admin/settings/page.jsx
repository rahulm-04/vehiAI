import React from 'react'
import { SettingsForm } from './_components/settings-form'

export const metaData = {
    title:"settings | VehiqlAdmin",
    Description:" mangae dealership working hours and admin users"
}

const settingsPage = () => {
  return (
    <div className='p-6'>
        <h1 className='text-2xl font-bold mb-6'>settings</h1>
        <SettingsForm/>
    </div>
  )
}

export default settingsPage
