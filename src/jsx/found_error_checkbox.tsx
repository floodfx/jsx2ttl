import { BaseJSXComponent, type ComponentContext } from "../ttl/ctx";

export class Checkbox extends BaseJSXComponent<{type: "toggle"}> {

  checked: boolean;

  constructor(props: {checked: boolean}) {
    super();
    this.checked = props.checked;
  }

  handleEvent(ctx: ComponentContext<any>, event: any): void | Promise<void> {
    console.log("handleEvent", event);
    switch(event.type) {
      case "toggle":
        this.checked = !this.checked;
    }
  }

  render() {
    return (
      <input type="checkbox" checked={this.checked} phx-click="toggle" />
    );
  }
}
