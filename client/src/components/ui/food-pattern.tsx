import { cn } from "@/lib/utils";

interface FoodPatternProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function FoodPattern({ children, className, ...props }: FoodPatternProps) {
  return (
    <div 
      className={cn("food-pattern", className)} 
      {...props}
    >
      {children}
    </div>
  );
}
