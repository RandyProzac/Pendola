import Image from "@tiptap/extension-image";

export const EDITORIAL_IMAGE_SIZES = ["sm", "md", "lg", "full"] as const;
export const EDITORIAL_IMAGE_ALIGNS = ["left", "center", "right"] as const;

export type EditorialImageSize = (typeof EDITORIAL_IMAGE_SIZES)[number];
export type EditorialImageAlign = (typeof EDITORIAL_IMAGE_ALIGNS)[number];

function isEditorialImageSize(value: unknown): value is EditorialImageSize {
  return typeof value === "string" && EDITORIAL_IMAGE_SIZES.includes(value as EditorialImageSize);
}

function isEditorialImageAlign(value: unknown): value is EditorialImageAlign {
  return typeof value === "string" && EDITORIAL_IMAGE_ALIGNS.includes(value as EditorialImageAlign);
}

export const EditorialImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      imageSize: {
        default: "lg",
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute("data-image-size");
          return isEditorialImageSize(value) ? value : "lg";
        },
        renderHTML: (attributes: { imageSize?: EditorialImageSize }) => ({
          "data-image-size": isEditorialImageSize(attributes.imageSize)
            ? attributes.imageSize
            : "lg",
        }),
      },
      imageAlign: {
        default: "center",
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute("data-image-align");
          return isEditorialImageAlign(value) ? value : "center";
        },
        renderHTML: (attributes: { imageAlign?: EditorialImageAlign }) => ({
          "data-image-align": isEditorialImageAlign(attributes.imageAlign)
            ? attributes.imageAlign
            : "center",
        }),
      },
    };
  },
});
