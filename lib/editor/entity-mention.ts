import { Mark, mergeAttributes } from "@tiptap/core";

export const EntityMentionMark = Mark.create({
  name: "entityMention",
  inclusive: false,
  spanning: false,

  addAttributes() {
    return {
      entityType: {
        default: "character",
        parseHTML: (element) => element.getAttribute("data-entity-type"),
        renderHTML: (attributes) => ({
          "data-entity-type": attributes.entityType,
        }),
      },
      entityId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-entity-id"),
        renderHTML: (attributes) =>
          attributes.entityId
            ? {
                "data-entity-id": attributes.entityId,
              }
            : {},
      },
      mentionId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-mention-id"),
        renderHTML: (attributes) =>
          attributes.mentionId
            ? {
                "data-mention-id": attributes.mentionId,
              }
            : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-entity-mention]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const entityType = HTMLAttributes["data-entity-type"] || "character";
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-entity-mention": "true",
        class: `entity-mention entity-mention--${entityType}`,
      }),
      0,
    ];
  },
});
