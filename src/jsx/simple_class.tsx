
export class SimpleClass {
  name: string;
  constructor(name: string) {
    this.name = name;
  }

  render() {
    return <div>Hello, {this.name}</div>;
  }
}
