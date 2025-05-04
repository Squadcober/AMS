import { AboutPageData as AboutPageDataType, Collateral } from '@/lib/types'

export function getAboutPageData(academyId: string): AboutPageDataType | null {
  const storedData = localStorage.getItem(`aboutPageData_${academyId}`)
  return storedData ? JSON.parse(storedData) : null
}

export function updateAboutPageData(academyId: string, data: AboutPageDataType): void {
  localStorage.setItem(`aboutPageData_${academyId}`, JSON.stringify(data))
}

export type CollateralFile = {
  academyId: string
  id: string
  name: string
  url: string
  type: string
  dateUploaded: string
}

export type AboutPageData = {
  logo: string | null
  color: string
  socialMedia: { name: string; url: string }[]
  collaterals: Collateral[]
  about: string
}
