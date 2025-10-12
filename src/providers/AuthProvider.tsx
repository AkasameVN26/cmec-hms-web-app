'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Spin } from 'antd';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  ho_ten: string;
  // Add other profile fields if needed
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  roles: string[];
  permissions: Set<string>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      setUser(currentUser ?? null);

      if (currentUser) {
        // Fetch profile, roles, and permissions in one go
        const { data: profileData, error } = await supabase
          .from('tai_khoan')
          .select(`
            *,
            user_roles (
              roles (
                ten_vai_tro,
                role_permissions (
                  permissions ( ten_quyen )
                )
              )
            )
          `)
          .eq('id', currentUser.id)
          .single();

        if (profileData) {
          setProfile(profileData);

          const userRoles: string[] = [];
          const userPermissions = new Set<string>();

          profileData.user_roles.forEach((userRole: any) => {
            const role = userRole.roles;
            if (role) {
              userRoles.push(role.ten_vai_tro);
              // Add system.admin permission if the role is Quản lý
              if (role.ten_vai_tro === 'Quản lý') {
                  userPermissions.add('system.admin');
              }
              role.role_permissions.forEach((rp: any) => {
                if (rp.permissions) {
                  userPermissions.add(rp.permissions.ten_quyen);
                }
              });
            }
          });

          setRoles(userRoles);
          setPermissions(userPermissions);
        }
      }
      setLoading(false);
    };

    fetchData();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        fetchData();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setRoles([]);
        setPermissions(new Set());
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    profile,
    roles,
    permissions,
    loading,
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // Helper function to check permissions
  const can = (permission: string) => {
      if (context.permissions.has('system.admin')) return true;
      return context.permissions.has(permission);
  }
  return { ...context, can };
};
