import { BaseJSXComponent } from "../ttl/ctx";

export class Hello extends BaseJSXComponent<any> {

  constructor(props: any) {
    super();
  }

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

export class Hello3 extends BaseJSXComponent<any> {

  constructor(props: any) {
    super();
  }

  render() {
    const { name } = this.props;
    return (
      <div>
        <h1>hi 3</h1>
      </div>
    );
  }
}

