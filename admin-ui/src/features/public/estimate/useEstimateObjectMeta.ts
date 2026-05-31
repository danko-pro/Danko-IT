import { useCallback, useState, type ChangeEvent } from "react";
import { type EstimateObjectMeta } from "./context";

export function useEstimateObjectMeta() {
  const [objectMeta, setObjectMeta] = useState<EstimateObjectMeta>({
    address: "",
    complexName: "",
    apartmentNumber: "",
    contact: "",
  });

  const onAddressChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setObjectMeta((current) => ({ ...current, address: event.target.value }));
  }, []);

  const onComplexNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setObjectMeta((current) => ({ ...current, complexName: event.target.value }));
  }, []);

  const onApartmentNumberChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setObjectMeta((current) => ({ ...current, apartmentNumber: event.target.value }));
  }, []);

  const onContactChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setObjectMeta((current) => ({ ...current, contact: event.target.value }));
  }, []);

  return {
    objectMeta,
    onAddressChange,
    onComplexNameChange,
    onApartmentNumberChange,
    onContactChange,
  };
}
