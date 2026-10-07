import { section } from "./prompt-utils.js";

const SHAPES = [
  '{"messageType":"text","text":""}',
  '{"messageType":"button","text":"","buttons":[{"id":"","title":""}]}',
  '{"messageType":"list","text":"","listButton":"","sections":[{"title":"","rows":[{"id":"","title":"","description":""}]}]}',
  '{"messageType":"image","text":"","imageUrl":""}',
  '{"messageType":"carousel","text":"","cards":[{"imageUrl":"","text":""}],"buttons":[{"id":"","title":""}]}',
  '{"messageType":"cta_url","text":"","link":{"label":"","url":""}}',
];

export const responseFormatPrompt = (interactive: boolean) =>
  section("Reply format", [
    "Return one JSON object and nothing else. No Markdown and no prose outside the JSON.",
    "Copy one shape. Do not rename keys or add a message type that is not listed.",
    interactive ? SHAPES.join("\n") : SHAPES[0],
  ]);
