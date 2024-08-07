export async function Stock({ symbol, numOfMonths }) {
  const data = await fetch(
    `https://api.example.com/stock/${symbol}/${numOfMonths}`
  )

  return (
    <div>
      <div>{symbol}</div>

      <div>
        {data.timeline.map((data, index) => (
          <div key={index}>
            <div>{data.date}</div>
            <div>{data.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
