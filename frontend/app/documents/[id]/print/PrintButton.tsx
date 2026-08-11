"use client";

import Button from "../../../../components/Button";

export default function PrintButton() {
  return (
    <Button
      onClick={() => {
        if (typeof window !== "undefined") {
          window.print();
        }
      }}
    >
      Print
    </Button>
  );
}
