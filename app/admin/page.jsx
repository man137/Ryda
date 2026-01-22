"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Car,
  Users,
  UserCheck,
  UserX,
  Search,
  Filter,
  Eye,
  Check,
  X,
  MoreHorizontal,
  Download,
  RefreshCw,
} from "lucide-react"

// Assuming these are imported from your UI library (e.g., shadcn/ui)
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [drivers, setDrivers] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

  // Check authentication and admin access
  useEffect(() => {
    if (status === "loading") {
      setIsAuthorized(false)
      return
    }
    if (!session) {
      setIsAuthorized(false)
      router.push("/login")
      return
    }
    if (session.user.accountType !== "owner") {
      setIsAuthorized(false)
      router.push("/")
      return
    }
    setIsAuthorized(true)
  }, [session, status, router])

  // Fetch drivers from API
  const fetchDrivers = async () => {
    try {
      setLoading(true)
      // This is the endpoint that the missing backend logic (GET /api/drivers) now handles
      const response = await fetch('/api/drivers')

      if (!response.ok) {
        // This is the line that was throwing the error before the backend was fixed
        throw new Error('Failed to fetch drivers')
      }

      const data = await response.json()
      setDrivers(data.drivers || [])
    } catch (error) {
      console.error('Error fetching drivers:', error)
      alert('Could not load driver data. Check server logs.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial data fetch - only fetch if user is authorized
  useEffect(() => {
    if (isAuthorized) {
      fetchDrivers()
    }
  }, [isAuthorized])

  // Show loading while checking auth or if not authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Statistics
  const totalDrivers = drivers.length
  const approvedDrivers = drivers.filter((d) => d.isApproved).length
  const pendingDrivers = drivers.filter((d) => !d.isApproved).length
  const activeDrivers = drivers.filter((d) => d.isActive).length 

  // Filter drivers based on search and status
  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch =
      driver.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone.includes(searchTerm)

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "approved" && driver.isApproved) ||
      (statusFilter === "pending" && !driver.isApproved) ||
      (statusFilter === "active" && driver.isActive) ||
      (statusFilter === "inactive" && !driver.isActive)

    return matchesSearch && matchesStatus
  })

  // Handler function to approve a driver
  const handleApproveDriver = async (driverId) => {
    try {
      setLoading(true)
      // This uses the PUT /api/drivers/[id] endpoint
      const response = await fetch(`/api/drivers/${driverId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve',
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }
      
      // Optimistic UI update: update local state immediately
      setDrivers(prev => prev.map(driver => 
        driver._id === driverId ? { ...driver, isApproved: true } : driver
      ))
      
    } catch (error) {
      console.error('Error approving driver:', error)
      alert(`Failed to approve driver: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Handler function to reject a driver
  const handleRejectDriver = async (driverId) => {
    try {
      setLoading(true)
      // This uses the PUT /api/drivers/[id] endpoint
      const response = await fetch(`/api/drivers/${driverId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reject',
          reason: 'Rejected by admin' 
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }
      
      // Optimistic UI update: update local state immediately
      setDrivers(prev => prev.map(driver => 
        driver._id === driverId ? { ...driver, isApproved: false } : driver
      ))
      
    } catch (error) {
      console.error('Error rejecting driver:', error)
      alert(`Failed to reject driver: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Handler function to toggle a driver's operational status
  const handleToggleActive = async (driverId) => {
    try {
      setLoading(true)
      const driver = drivers.find(d => d._id === driverId)
      const action = driver.isActive ? 'deactivate' : 'activate' 
      
      // This uses the PUT /api/drivers/[id] endpoint
      const response = await fetch(`/api/drivers/${driverId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: action,
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }
      
      // Optimistic UI update: update local state immediately
      setDrivers(prev => prev.map(driver => 
        driver._id === driverId ? { ...driver, isActive: !driver.isActive } : driver
      ))
      
    } catch (error) {
      console.error('Error updating driver status:', error)
      alert(`Failed to update driver status: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchDrivers()
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return 'Invalid Date'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Car className="h-8 w-8 text-[#FFD331]" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Ryda Admin</h1>
                <p className="text-sm text-gray-500">Driver Management Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDrivers}</div>
              <p className="text-xs text-muted-foreground">Registered drivers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedDrivers}</div>
              <p className="text-xs text-muted-foreground">Verified drivers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <UserX className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pendingDrivers}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Car className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{activeDrivers}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search drivers by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Drivers</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Drivers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Drivers ({filteredDrivers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>License</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDrivers.map((driver) => (
                      <TableRow key={driver._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {driver.firstName} {driver.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{driver.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{driver.phone}</div>
                          <div className="text-xs text-gray-500">{driver.address}</div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{driver.vehicleModel}</div>
                            <div className="text-sm text-gray-500">{driver.licensePlate}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{driver.driverLicense}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {/* Verification Status (Approved/Pending) */}
                            <Badge
                              variant={driver.isApproved ? "default" : "secondary"}
                              className={
                                driver.isApproved ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                              }
                            >
                              {driver.isApproved ? "Approved" : "Pending"}
                            </Badge>
                            {/* Operational Status (Active/Inactive) */}
                            <Badge
                              variant={driver.isActive ? "default" : "secondary"}
                              className={driver.isActive ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}
                            >
                              {driver.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{formatDate(driver.createdAt)}</div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/drivers/${driver._id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              {/* Action: Approve */}
                              {!driver.isApproved && (
                                <DropdownMenuItem onClick={() => handleApproveDriver(driver._id)} disabled={loading}>
                                  <Check className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                              )}
                              {/* Action: Reject/Unapprove */}
                              {driver.isApproved && (
                                <DropdownMenuItem onClick={() => handleRejectDriver(driver._id)} disabled={loading}>
                                  <X className="h-4 w-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              )}
                              {/* Action: Toggle Active/Inactive */}
                              <DropdownMenuItem onClick={() => handleToggleActive(driver._id)} disabled={loading}>
                                {driver.isActive ? (
                                  <>
                                    <X className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredDrivers.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {drivers.length === 0 ? "No drivers have registered yet" : "No matching drivers found"}
                    </h3>
                    <p className="text-gray-500">
                      {searchTerm || statusFilter !== "all"
                        ? "Try adjusting your search or filter criteria."
                        : "Check back later or refresh the page."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}