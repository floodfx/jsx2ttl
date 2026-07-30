export interface Component {
  render(): any;
}

export class SomeComponent implements Component {
  name: string;
  constructor(name: string) {
    this.name = name;
  }

  render() {
    return <div>Hello, {this.name}</div>;
  }
}
