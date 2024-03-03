function Foo1(props: {msg: number}) {
  return <div>hi {props.msg}</div>;
}

function App(props: {name: string}) {
  return <h1 className="foo">Hello {props.name}. <Foo1 msg={1+3} /></h1>;
}

export default App;
