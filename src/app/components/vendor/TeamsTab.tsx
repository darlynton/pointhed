import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';
import { apiClient } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

export function TeamsTab() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';

  const [addTeamOpen, setAddTeamOpen] = useState(false);
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviting, setInviting] = useState(false);

  const [team, setTeam] = useState<Array<{ id: string; fullName: string; email: string; role: string; isActive: boolean }>>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  useEffect(() => {
    if (isOwner) fetchTeam();
  }, [isOwner]);

  const fetchTeam = async () => {
    try {
      setTeamLoading(true);
      const res = await apiClient.getTeam();
      setTeam(res.users || []);
    } catch (e) {
      setTeam([]);
    } finally {
      setTeamLoading(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
            <CardDescription>Manage your staff</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>Only the business owner can view and manage the team.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-1">Team</h2>
          <p className="text-sm sm:text-base text-gray-600">Invite and manage staff access</p>
        </div>
        <Dialog open={addTeamOpen} onOpenChange={setAddTeamOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto">Add Team Member</Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>Create a staff account for your tenant</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label>Full Name *</Label>
                  <Input placeholder="Jane Doe" value={inviteFullName} onChange={(e) => setInviteFullName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input type="email" placeholder="jane@business.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone (Optional)</Label>
                  <Input placeholder="+2348012345678" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setAddTeamOpen(false)} disabled={inviting}>Cancel</Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={async () => {
                    if (!inviteFullName.trim() || !inviteEmail.trim()) {
                      toast.error('Full name and email are required');
                      return;
                    }
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(inviteEmail)) {
                      toast.error('Please enter a valid email');
                      return;
                    }
                    try {
                      setInviting(true);
                      await apiClient.createStaff({
                        fullName: inviteFullName.trim(),
                        email: inviteEmail.trim(),
                        phoneNumber: invitePhone.trim() || undefined,
                      });
                      toast.success('Staff invited successfully');
                      setInviteFullName('');
                      setInviteEmail('');
                      setInvitePhone('');
                      setAddTeamOpen(false);
                      fetchTeam();
                    } catch (error: any) {
                      const msg = error?.message || 'Failed to invite staff';
                      if (/already exists/i.test(msg)) {
                        toast.error('A staff with this email already exists');
                      } else {
                        toast.error(msg);
                      }
                    } finally {
                      setInviting(false);
                    }
                  }}
                  disabled={inviting}
                >
                  {inviting ? 'Inviting...' : 'Invite'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Team Members</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Manage access for your team</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {teamLoading ? (
            <div className="text-sm text-gray-600">Loading team...</div>
          ) : team.length === 0 ? (
            <div className="text-sm text-gray-600">No team members yet</div>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="md:hidden space-y-3">
                {team.map((member) => (
                  <div key={member.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{member.fullName}</p>
                        <p className="text-xs text-gray-500 truncate">{member.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${member.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-gray-500 capitalize">{member.role}</span>
                      <Button
                        variant={member.isActive ? 'destructive' : 'default'}
                        size="sm"
                        className="h-7 text-xs"
                        disabled={member.role === 'owner'}
                        onClick={async () => {
                          try {
                            await apiClient.updateStaffStatus(member.id, !member.isActive);
                            toast.success(member.isActive ? 'Deactivated' : 'Activated');
                            fetchTeam();
                          } catch (e: any) {
                            toast.error(e?.message || 'Update failed');
                          }
                        }}
                      >
                        {member.role === 'owner' ? 'Owner' : member.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table view */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {team.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>{member.fullName}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell className="capitalize">{member.role}</TableCell>
                        <TableCell>{member.isActive ? 'Active' : 'Inactive'}</TableCell>
                        <TableCell>
                          <Button
                            variant={member.isActive ? 'destructive' : 'default'}
                            size="sm"
                            disabled={member.role === 'owner'}
                            onClick={async () => {
                              try {
                                await apiClient.updateStaffStatus(member.id, !member.isActive);
                                toast.success(member.isActive ? 'Deactivated' : 'Activated');
                                fetchTeam();
                              } catch (e: any) {
                                toast.error(e?.message || 'Update failed');
                              }
                            }}
                          >
                            {member.role === 'owner' ? 'Owner' : member.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TeamsTab;
