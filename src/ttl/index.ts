/**
 * Bare minimum Tagged Template Literal (TTL) implementation.
 */
export class Template {
  constructor(
    public readonly statics: readonly string[],
    public readonly dynamics: readonly unknown[]
  ) {}

  toString(): string {
    return this.statics.reduce((result, staticPart, i) => {
      const dynamicVal = this.dynamics[i - 1];
      const strVal =
        dynamicVal === null || dynamicVal === undefined ? "" : String(dynamicVal);
      return result + strVal + staticPart;
    });
  }
}

export function html(
  statics: TemplateStringsArray | readonly string[],
  ...dynamics: unknown[]
): Template {
  return new Template(statics, dynamics);
}
