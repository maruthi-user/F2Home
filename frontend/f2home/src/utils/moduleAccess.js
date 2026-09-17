import { useSelector } from "react-redux";
import { useEffect, useRef, useState } from 'react';

export const hasModuleAccess = (user, module) => {


  if (!user) return false;

  switch (module) {
    case "HR":
      return [
        "SUPER_ADMIN",
        "ADMIN",
        "HR",
      ].includes(user.role);

    case "Admin":
      return [
        "SUPER_ADMIN",
        "ADMIN",
      ].includes(user.role);

    default:
      return false;
  }
};
