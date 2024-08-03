export async function Weather({ city, unit }) {
  // Mocked data instead of an actual API call
  const data = {
    temperature: '25', // Dummy temperature value
    unit: unit === 'C' ? 'Celsius' : 'Fahrenheit', // Converting unit to a readable format
    description: 'Sunny' // Dummy weather description
  }

  return (
    <div className="border border-neutral-200 p-4 rounded-lg max-w-fit">
      <div>
        Temperature: {data.temperature}°{data.unit}
      </div>
      <div>Unit: {data.unit}</div>
      <div>Description: {data.description}</div>
    </div>
  )
}
