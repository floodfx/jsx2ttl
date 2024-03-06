import type { ReactNode } from "react";

interface SomeInterface {
  render(): ReactNode;
}

export class ImplementsClass implements SomeInterface {
  name: string;
  constructor(name: string) {
    this.name = name;
  }

  render() {
    return <div>Hello, {this.name}</div>;
  }
}
