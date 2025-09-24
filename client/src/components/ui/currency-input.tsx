import { forwardRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, 'value' | 'onChange'> {
  value: string | number;
  onValueChange: (value: number) => void;
  displayValue?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, displayValue, className, ...props }, ref) => {
    const [formattedValue, setFormattedValue] = useState(() => {
      if (displayValue !== undefined) return displayValue;
      if (typeof value === 'string') return formatCurrencyInput(value);
      return value > 0 ? formatCurrencyInput(value.toString()) : '';
    });

    useEffect(() => {
      if (displayValue !== undefined) {
        setFormattedValue(displayValue);
      } else if (typeof value === 'string') {
        setFormattedValue(formatCurrencyInput(value));
      } else if (value > 0) {
        setFormattedValue(formatCurrencyInput(value.toString()));
      } else {
        setFormattedValue('');
      }
    }, [value, displayValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const formatted = formatCurrencyInput(inputValue);
      setFormattedValue(formatted);
      
      const numericValue = parseCurrencyInput(formatted);
      onValueChange(numericValue);
    };

    return (
      <Input
        ref={ref}
        value={formattedValue}
        onChange={handleChange}
        placeholder="0"
        className={className}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";