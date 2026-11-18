import { createContext, useContext } from "react";

export const TrainingDataContext = createContext(null);

export function useTrainingData() {
    const context = useContext(TrainingDataContext);
    if (!context) {
        throw new Error("useTrainingData must be used inside TrainingDataProvider.");
    }
    return context;
}
