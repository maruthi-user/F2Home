import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "./slices/apiSlice";
import authReducer from "./slices/authSlice";
import processingReducer from "./slices/processingSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Global "processing lock" (form submits / exports block the page while
    // they run) - see slices/processingSlice.js and components/common/ProcessingOverlay.jsx.
    processing: processingReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});
