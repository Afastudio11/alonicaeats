import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/queryClient";

export function useErrorHandler() {
  const { toast } = useToast();

  const handleError = (error: unknown, title?: string) => {
    const message = getErrorMessage(error);
    
    toast({
      title: title || "Terjadi kesalahan",
      description: message,
      variant: "destructive",
    });
  };

  const createErrorHandler = (title?: string) => (error: unknown) => {
    handleError(error, title);
  };

  return { handleError, createErrorHandler };
}