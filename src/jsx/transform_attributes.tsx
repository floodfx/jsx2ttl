
export function HasClassNameAttr() {
  return (
    <div className="foo">Bar</div>
  )
}

export function HasStyleAttr() {
  const blue: string = "blue";
  return (
    <div style={{backgroundColor: "red", alignContent: "start", color:blue }}>Bar</div>
  )
}
