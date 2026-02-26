import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { mockBroadcasts, formatDateTime } from '../../../lib/mockData';
import { Plus, Send, Clock, CheckCircle2, XCircle, MessageSquare, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

export function BroadcastsTab() {
  const [broadcasts, setBroadcasts] = useState(mockBroadcasts);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="size-4 text-green-600" />;
      case 'scheduled':
        return <Clock className="size-4 text-blue-600" />;
      case 'sending':
        return <Send className="size-4 text-amber-600" />;
      default:
        return <XCircle className="size-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'scheduled':
        return 'bg-blue-100 text-blue-700';
      case 'sending':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-red-100 text-red-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Broadcast Messages</h2>
          <p className="text-gray-600">Send WhatsApp messages to your loyalty members</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Create Broadcast
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Broadcast Message</DialogTitle>
              <DialogDescription>Send a message to your loyalty program members</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Campaign Name</label>
                <Input placeholder="e.g., Weekend Sale Announcement" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Message Content</label>
                <Textarea 
                  placeholder="Write your message here... Use emojis to make it engaging! 🎉"
                  rows={5}
                />
                <p className="text-xs text-gray-500 mt-1">Characters: 0/1000</p>
              </div>

              {/* Target Segment */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <h4 className="font-medium">Target Audience</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">All active customers</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">VIP customers only</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Customers with points &gt; 100</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Inactive customers (no transaction in 30 days)</span>
                  </label>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium">Estimated Recipients: <span className="text-blue-600">342</span></p>
                </div>
              </div>

              {/* Schedule */}
              <div>
                <label className="text-sm font-medium mb-1 block">Schedule</label>
                <div className="grid grid-cols-2 gap-3">
                  <Input type="date" />
                  <Input type="time" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Leave empty to send immediately</p>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button className="flex-1" variant="outline">
                  <Clock className="size-4 mr-2" />
                  Schedule
                </Button>
                <Button className="flex-1">
                  <Send className="size-4 mr-2" />
                  Send Now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Sent</p>
                <p className="text-2xl font-semibold">{broadcasts.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <MessageSquare className="size-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Recipients</p>
                <p className="text-2xl font-semibold">
                  {broadcasts.reduce((sum, b) => sum + b.total_recipients, 0)}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <Users className="size-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Delivery Rate</p>
                <p className="text-2xl font-semibold">
                  {(() => {
                    const sent = broadcasts.reduce((sum, b) => sum + b.sent_count, 0);
                    const delivered = broadcasts.reduce((sum, b) => sum + b.delivered_count, 0);
                    return sent > 0 ? `${Math.round((delivered / sent) * 100)}%` : '0%';
                  })()}
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <CheckCircle2 className="size-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Scheduled</p>
                <p className="text-2xl font-semibold">
                  {broadcasts.filter(b => b.status === 'scheduled').length}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Clock className="size-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Broadcasts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Broadcast History</CardTitle>
          <CardDescription>All broadcast messages and their performance</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead>Delivery Rate</TableHead>
                <TableHead>Scheduled/Sent At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {broadcasts.map((broadcast) => (
                <TableRow key={broadcast.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{broadcast.name}</p>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {broadcast.message_content}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(broadcast.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(broadcast.status)}
                        <span className="capitalize">{broadcast.status}</span>
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>{broadcast.total_recipients}</TableCell>
                  <TableCell>{broadcast.sent_count}</TableCell>
                  <TableCell>{broadcast.delivered_count}</TableCell>
                  <TableCell>
                    {broadcast.sent_count > 0
                      ? `${Math.round((broadcast.delivered_count / broadcast.sent_count) * 100)}%`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {broadcast.scheduled_at ? formatDateTime(broadcast.scheduled_at) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Broadcasting Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 mt-0.5 flex-shrink-0" />
              <span>Keep messages concise and valuable - respect your customers' time</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 mt-0.5 flex-shrink-0" />
              <span>Send broadcasts during business hours (9 AM - 6 PM) for better engagement</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 mt-0.5 flex-shrink-0" />
              <span>Use emojis to make your messages more engaging 🎉</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 mt-0.5 flex-shrink-0" />
              <span>Segment your audience for more relevant messaging</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 mt-0.5 flex-shrink-0" />
              <span>Limit broadcasts to 2-3 times per week to avoid opt-outs</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
