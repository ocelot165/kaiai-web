import React from "react";
import * as Checkbox from "@radix-ui/react-checkbox";
import { CheckIcon } from "@radix-ui/react-icons";

const CheckboxDummy = () => (
  <form>
    <div className="flex items-center">
      <Checkbox.Root
        className="flex h-[18px] w-[18px] appearance-none items-center justify-center rounded-[4px]  outline-none border border-lm-orange"
        defaultChecked
      >
        <Checkbox.Indicator className="text-lm-orange">
          <CheckIcon />
        </Checkbox.Indicator>
      </Checkbox.Root>
    </div>
  </form>
);

export default CheckboxDummy;
