"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { CustomTooltip } from "@/components/custom-tooltip"

export default function AccessEntities() {
  const [entities, setEntities] = useState([
    { id: 1, name: "John Doe", role: "Student", access: true },
    { id: 2, name: "Jane Smith", role: "Coach", access: true },
    { id: 3, name: "Mike Johnson", role: "Admin", access: true },
    { id: 4, name: "Sarah Brown", role: "Student", access: false },
  ])

  const toggleAccess = (id: number) => {
    setEntities(entities.map((entity) => (entity.id === id ? { ...entity, access: !entity.access } : entity)))
  }

  return (
    <div className="space-y-6">
      <CustomTooltip content="Manage access permissions for users">
        <h1 className="text-3xl font-bold text-white">Access Entities</h1>
      </CustomTooltip>
      <CustomTooltip content="Control access rights for different user roles">
        <Card>
          <CardHeader>
            <CardTitle>Manage Access</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entities.map((entity) => (
                  <TableRow key={entity.id}>
                    <TableCell>{entity.name}</TableCell>
                    <TableCell>{entity.role}</TableCell>
                    <TableCell>
                      <Badge variant={entity.access ? "success" : "destructive"}>
                        {entity.access ? "Granted" : "Revoked"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch checked={entity.access} onCheckedChange={() => toggleAccess(entity.id)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </CustomTooltip>
    </div>
  )
}

