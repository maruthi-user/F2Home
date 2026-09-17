import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  token: localStorage.getItem("token") || null,
  expiresIn: localStorage.getItem("expiresIn") || null,
  refreshToken: localStorage.getItem("refreshToken") || null,
  user: localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user"))
    : null,
  // True only when the session was cleared automatically (JWT expiry or a
  // 401 from the API) — drives the "session expired" modal. A manual
  // logout() never sets this, so the modal doesn't show on a deliberate logout.
  sessionExpired: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setTokenData: (state, action) => {
      const { token, expiresIn, refreshToken } = action.payload;
      state.token = token;
      state.expiresIn = expiresIn;
      if (refreshToken !== undefined) state.refreshToken = refreshToken;
      state.sessionExpired = false;
      localStorage.setItem("token", token);
      localStorage.setItem("expiresIn", String(expiresIn));
      if (refreshToken !== undefined) {
        localStorage.setItem("refreshToken", refreshToken);
      }
    },
    setUserData: (state, action) => {
      state.user = action.payload;
      localStorage.setItem("user", JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.token = null;
      state.expiresIn = null;
      state.refreshToken = null;
      state.user = null;
      state.sessionExpired = false;
      localStorage.removeItem("token");
      localStorage.removeItem("expiresIn");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("formattedUser");
    },
    expireSession: (state) => {
      state.token = null;
      state.expiresIn = null;
      state.refreshToken = null;
      state.user = null;
      state.sessionExpired = true;
      localStorage.removeItem("token");
      localStorage.removeItem("expiresIn");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("formattedUser");
    },
  },
});

export const { setTokenData, setUserData, logout, expireSession } =
  authSlice.actions;
export default authSlice.reducer;