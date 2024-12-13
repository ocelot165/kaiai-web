import React, { ChangeEvent, RefObject } from "react";

type Props = {
  disabled?: boolean;
  value?: string | number;
  inputRef?: RefObject<HTMLInputElement>;
  onValueChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  className?: string;
  placeholder?: string;
  qa?: string;
};

const Input = ({
  value = "",
  inputRef,
  onValueChange,
  onFocus,
  onBlur,
  placeholder,
  qa,
  disabled,
}: Props) => {
  function onChange(e: ChangeEvent<HTMLInputElement>) {
    if (e && onValueChange) onValueChange(e);
  }

  return (
    <input
      disabled={disabled}
      data-qa={qa}
      type="text"
      placeholder={placeholder}
      value={value}
      ref={inputRef}
      onChange={onChange}
      autoComplete="off"
      autoCorrect="off"
      minLength={1}
      maxLength={60}
      spellCheck="false"
      onFocus={onFocus}
      onBlur={onBlur}
      className="grow bg-lm-black border-dashed text-lm-orange border border-lm-orange focus:outline-none focus:none focus:ring-lm-orange placeholder-gray-400 p-1 text-right disabled:border-lm-gray"
    />
  );
};

export default Input;
