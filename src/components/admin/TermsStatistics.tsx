// components/admin/TermsStatistics.tsx
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatPercent } from '@/lib/utils';
import { AlertCircle, Loader2, Users } from 'lucide-react';

type TermsAcceptance = {
  id: string;
  terms_id: string;
  user_id: string;
  accepted_at: string;
  user_email?: string;
  user_name?: string;
};

type TermsStats = {
  termsId: string;
  title: string;
  version: number;
  type: string;
  college_id: string | null;
  college_name: string | null;
  totalUsers: number;
  acceptedCount: number;
  acceptanceRate: number;
  latestAcceptances: TermsAcceptance[];
};

type TermsStatisticsProps = {
  termsId: string;
};

// Define profile type used in the acceptance data
type Profile = {
  email?: string;
  first_name?: string;
  last_name?: string;
};

// Define acceptance data structure from the database
type AcceptanceData = {
  id: string;
  terms_id: string;
  user_id: string;
  accepted_at: string;
  profiles?: Profile;
};

export function TermsStatistics({ termsId }: TermsStatisticsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TermsStats | null>(null);
  const [acceptances, setAcceptances] = useState<TermsAcceptance[]>([]);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    const fetchData = async () => {
      if (!termsId) return;
      
      setLoading(true);
      try {
        // Fetch terms details
        const { data: termsData, error: termsError } = await supabase
          .from('terms_and_conditions')
          .select(`
            *,
            colleges(name)
          `)
          .eq('id', termsId)
          .single();
          
        if (termsError) throw termsError;
        
        // Fetch acceptance data
        const { data: acceptanceData, error: acceptanceError } = await supabase
          .from('terms_acceptance')
          .select(`
            *,
            profiles(email, first_name, last_name)
          `)
          .eq('terms_id', termsId)
          .order('accepted_at', { ascending: false });
          
        if (acceptanceError) throw acceptanceError;
        
        // Transform acceptance data
        const formattedAcceptances = (acceptanceData as AcceptanceData[]).map((acceptance) => ({
          ...acceptance,
          user_email: acceptance.profiles?.email,
          user_name: acceptance.profiles?.first_name && acceptance.profiles?.last_name ? 
            `${acceptance.profiles.first_name} ${acceptance.profiles.last_name}` : 
            acceptance.profiles?.email || 'Unknown User'
        }));
        
        setAcceptances(formattedAcceptances);
        
        // Get user count for acceptance rate calculation
        const { count: totalUsers, error: userCountError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student'); // or whatever criteria defines your user base
          
        if (userCountError) throw userCountError;
        
        // Build stats object
        setStats({
          termsId,
          title: termsData.title,
          version: termsData.version,
          type: termsData.type,
          college_id: termsData.college_id,
          college_name: termsData.colleges?.name,
          totalUsers: totalUsers || 0,
          acceptedCount: formattedAcceptances.length,
          acceptanceRate: totalUsers ? (formattedAcceptances.length / totalUsers) : 0,
          latestAcceptances: formattedAcceptances.slice(0, 5),
        });
        
      } catch (error) {
        console.error('Error fetching terms statistics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [termsId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
        <AlertCircle className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-black">Could not load terms statistics.</p>
      </div>
    );
  }

  return (
    <Card className="text-black">
      <CardHeader>
        <CardTitle className="text-black">Terms Acceptance Analytics</CardTitle>
        <CardDescription className="text-black">
          Statistics for version {stats.version} of {stats.title} terms
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="summary" className="text-black">Summary</TabsTrigger>
            <TabsTrigger value="users" className="text-black">Accepted Users</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-black">Acceptance Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2 text-black">{formatPercent(stats.acceptanceRate)}</div>
                  <Progress value={stats.acceptanceRate * 100} className="h-2" />
                  <p className="text-xs text-black mt-2">
                    {stats.acceptedCount} out of {stats.totalUsers} users
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-black">Total Acceptances</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Users className="mr-2 h-5 w-5 text-black" />
                    <div className="text-2xl font-bold text-black">{stats.acceptedCount}</div>
                  </div>
                  <p className="text-xs text-black mt-2">
                    Users who have accepted these terms
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-black">Latest Acceptance</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.latestAcceptances.length > 0 ? (
                    <>
                      <div className="text-lg font-medium truncate text-black">
                        {stats.latestAcceptances[0].user_name}
                      </div>
                      <p className="text-xs text-black">
                        {formatDate(stats.latestAcceptances[0].accepted_at)}
                      </p>
                    </>
                  ) : (
                    <p className="text-black">No acceptances yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {stats.latestAcceptances.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium text-black">Recent Acceptances</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableBody>
                      {stats.latestAcceptances.map((acceptance) => (
                        <TableRow key={acceptance.id}>
                          <TableCell className="font-medium text-black">{acceptance.user_name}</TableCell>
                          <TableCell className="text-black">{acceptance.user_email}</TableCell>
                          <TableCell className="text-right text-black">{formatDate(acceptance.accepted_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="users">
            {acceptances.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-black">No users have accepted these terms yet</p>
              </div>
            ) : (
              <Table>
                <TableCaption className="text-black">A list of users who have accepted these terms</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-black">User</TableHead>
                    <TableHead className="text-black">Email</TableHead>
                    <TableHead className="text-right text-black">Accepted At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acceptances.map((acceptance) => (
                    <TableRow key={acceptance.id}>
                      <TableCell className="font-medium text-black">{acceptance.user_name}</TableCell>
                      <TableCell className="text-black">{acceptance.user_email}</TableCell>
                      <TableCell className="text-right text-black">{formatDate(acceptance.accepted_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}