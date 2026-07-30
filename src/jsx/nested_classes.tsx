import { Component } from "react";

export class Hello extends Component<any> {
  render() {
    const { name } = this.props;
    return (
      <div>
        <h1>Hello</h1>
        <Hello3 name={name} />
      </div>
    );
  }
}

export class Hello3 extends Component<any> {
  render() {
    const { name } = this.props;
    return (
      <div>
        <h1>hi 3</h1>
      </div>
    );
  }
}

