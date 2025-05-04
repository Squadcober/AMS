import { ReactNode } from "react";

export interface Coach {
  academyId: string;
  role: string;
  experience: ReactNode;
  photoUrl: string | undefined;
  rating: ReactNode;
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization?: string;
  status: "active" | "inactive";
  createdAt: string;
  userId: string;
}

export interface AboutPageData {
  logo: string | null;
  color: string;
  socialMedia: { name: string; url: string }[];
  collaterals: Collateral[];
  about: string;
}

export interface Collateral {
  name: string;
  checked: boolean;
  files: CollateralFile[];
  acceptedTypes: string;
}

export interface CollateralFile {
  id: string;
  name: string;
  url: string;
  type: string;
  dateUploaded: string;
}
