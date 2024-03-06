
class SomeBaseClass {
  foo() {
    return "foo";  
  }
}

export class InheritsClass extends SomeBaseClass {
  name: string;
  constructor(name: string) {
    super();
    this.name = name;
  }

  render() {
    return <div>Hello, {this.name}</div>;
  }
}
