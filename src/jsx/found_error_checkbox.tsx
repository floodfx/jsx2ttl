export class Checkbox {

  checked: boolean;

  constructor(props: {checked: boolean}) {
    this.checked = props.checked;
  }

  handleEvent(ctx: any, event: any): void | Promise<void> {
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
