import React, { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { twMerge } from "tailwind-merge";

type Props = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }
>;

const Button = (props: Props) => {
  const { children, className, loading = false, ...buttonProps } = props;

  return (
    <button
      {...buttonProps}
      className={twMerge(
        "bg-lm-dark-gray px-2 text-lm-gray font-semibold hover:text-lm-orange h-8",
        className
      )}
    >
      {loading ? (
        <div
          id="loader"
          className="w-full flex justify-center scale-[0.8] fill-black"
        ></div>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
