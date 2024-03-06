import { expect, test } from "bun:test";

// test snapshots of the generated code
// these tests rely on the jsx2ttlPlugin being loaded via bunfig.toml

import Profile from "../jsx/simple_static";
test("simple_static", () => {
  expect(Profile().toString()).toMatchSnapshot();
});

import Gallery from "../jsx/nested_static";
test("nested_static", () => {
  expect(Gallery().toString()).toMatchSnapshot();
});

import CWithProps from "../jsx/simple_props";
test("simple_props", () => {
  expect(CWithProps({count: 11}).toString()).toMatchSnapshot();
});

import App from "../jsx/nested_props";
test("nested_props", () => {
  expect(App({name: "bar"}).toString()).toMatchSnapshot();
});

import { SimpleClass } from "../jsx/simple_class";
test("simple_class", () => {
  expect(new SimpleClass("world").render().toString()).toMatchSnapshot();
});

import { ImplementsClass } from "../jsx/implements_class";
test("implements_class", () => {
  expect(new ImplementsClass("world").render().toString()).toMatchSnapshot();
});

import { InheritsClass } from "../jsx/inherits_class";
test("inherits_class", () => {
  expect(new InheritsClass("world").render().toString()).toMatchSnapshot();
});

import { Arrow } from "../jsx/simple_static_arrow";
test("simple_static_arrow", () => {
  expect(Arrow().toString()).toMatchSnapshot();
});


