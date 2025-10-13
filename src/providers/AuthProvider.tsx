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
        // Step 1: Fetch basic profile
        const { data: profileData, error: profileError } = await supabase
          .from('tai_khoan')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (profileError || !profileData) {
          console.error("AuthProvider Error: Could not fetch user profile.", profileError);
          setLoading(false);
          return;
        }
        setProfile(profileData);

        // Step 2: Fetch role IDs from user_roles
        const { data: userRolesData, error: userRolesError } = await supabase
          .from('user_roles')
          .select('id_vai_tro')
          .eq('id_tai_khoan', currentUser.id);

        if (userRolesError) {
          console.error("AuthProvider Error: Could not fetch user role links.", userRolesError);
          setLoading(false);
          return;
        }
        const roleIds = userRolesData.map(r => r.id_vai_tro);

        if (roleIds.length > 0) {
          // Step 3: Fetch roles and their permissions
          const { data: rolesData, error: rolesError } = await supabase
            .from('roles')
            .select('ten_vai_tro, role_permissions(permissions(ten_quyen))')
            .in('id', roleIds);

          if (rolesError) {
            console.error("AuthProvider Error: Could not fetch roles and permissions.", rolesError);
          } else if (rolesData) {
            const userRoles: string[] = [];
            const userPermissions = new Set<string>();

            rolesData.forEach((role: any) => {
              userRoles.push(role.ten_vai_tro);
              if (role.ten_vai_tro === 'Quản lý') {
                userPermissions.add('system.admin');
              }
              role.role_permissions.forEach((rp: any) => {
                if (rp.permissions) {
                  userPermissions.add(rp.permissions.ten_quyen);
                }
              });
            });
            setRoles(userRoles);
            setPermissions(userPermissions);
          }
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
