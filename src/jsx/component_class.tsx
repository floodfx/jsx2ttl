import type { ReactNode } from "react";
import type { Component } from "../ttl/ctx";


export class SomeComponent implements Component<any, any, ReactNode> {
  name: string;
  constructor(name: string) {
    this.name = name;
  }

  render() {
    return <div>Hello, {this.name}</div>;
  }
}
