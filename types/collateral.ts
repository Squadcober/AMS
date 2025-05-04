export type CollateralFile = {
    academyId: string
    id: string
    name: string
    url: string
    type: string
    dateUploaded: string
  }
  
  export type Collateral = {
    academyId: string
    name: string
    checked: boolean
    files: CollateralFile[]
    acceptedTypes: string
  }
  