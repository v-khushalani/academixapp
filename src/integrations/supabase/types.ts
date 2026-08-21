export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          batch_id: string | null
          created_at: string
          date: string
          id: string
          institute_id: string
          marked_by: string | null
          notified_at: string | null
          remarks: string | null
          source: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          date?: string
          id?: string
          institute_id?: string
          marked_by?: string | null
          notified_at?: string | null
          remarks?: string | null
          source?: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          date?: string
          id?: string
          institute_id?: string
          marked_by?: string | null
          notified_at?: string | null
          remarks?: string | null
          source?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_devices: {
        Row: {
          created_at: string
          id: string
          institute_id: string
          is_active: boolean
          last_seen_at: string | null
          location: string | null
          name: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          institute_id: string
          is_active?: boolean
          last_seen_at?: string | null
          location?: string | null
          name: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          institute_id?: string
          is_active?: boolean
          last_seen_at?: string | null
          location?: string | null
          name?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_devices_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          capacity: number
          class_level: string | null
          created_at: string
          default_fee: number
          end_date: string | null
          faculty_id: string | null
          id: string
          installment_plan: Json | null
          institute_id: string
          name: string
          notes: string | null
          room: string | null
          schedule: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["batch_status"]
          updated_at: string
        }
        Insert: {
          capacity?: number
          class_level?: string | null
          created_at?: string
          default_fee?: number
          end_date?: string | null
          faculty_id?: string | null
          id?: string
          installment_plan?: Json | null
          institute_id?: string
          name: string
          notes?: string | null
          room?: string | null
          schedule?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["batch_status"]
          updated_at?: string
        }
        Update: {
          capacity?: number
          class_level?: string | null
          created_at?: string
          default_fee?: number
          end_date?: string | null
          faculty_id?: string | null
          id?: string
          installment_plan?: Json | null
          institute_id?: string
          name?: string
          notes?: string | null
          room?: string | null
          schedule?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["batch_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          date: string
          description: string | null
          faculty_id: string | null
          id: string
          institute_id: string
          payment_method: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          date?: string
          description?: string | null
          faculty_id?: string | null
          id?: string
          institute_id: string
          payment_method?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string
          description?: string | null
          faculty_id?: string | null
          id?: string
          institute_id?: string
          payment_method?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty: {
        Row: {
          base_salary: number | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          institute_id: string
          joining_date: string | null
          notes: string | null
          phone: string | null
          qualification: string | null
          status: string
          subject: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          base_salary?: number | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          institute_id?: string
          joining_date?: string | null
          notes?: string | null
          phone?: string | null
          qualification?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          base_salary?: number | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          institute_id?: string
          joining_date?: string | null
          notes?: string | null
          phone?: string | null
          qualification?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faculty_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_invites: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          faculty_id: string | null
          full_name: string
          id: string
          institute_id: string
          phone: string | null
          subject: string | null
          token: string
          updated_at: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          faculty_id?: string | null
          full_name: string
          id?: string
          institute_id: string
          phone?: string | null
          subject?: string | null
          token?: string
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          faculty_id?: string | null
          full_name?: string
          id?: string
          institute_id?: string
          phone?: string | null
          subject?: string | null
          token?: string
          updated_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faculty_invites_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_invites_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_adjustments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          fee_id: string
          id: string
          institute_id: string
          kind: string
          reason: string | null
          student_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          fee_id: string
          id?: string
          institute_id: string
          kind: string
          reason?: string | null
          student_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          fee_id?: string
          id?: string
          institute_id?: string
          kind?: string
          reason?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_adjustments_fee_id_fkey"
            columns: ["fee_id"]
            isOneToOne: false
            referencedRelation: "fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_adjustments_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_adjustments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fees: {
        Row: {
          amount: number
          amount_paid: number
          batch_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          installment_no: number
          installment_of: number
          institute_id: string
          method: string | null
          paid_date: string | null
          receipt_no: string | null
          status: Database["public"]["Enums"]["fee_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          amount_paid?: number
          batch_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          installment_no?: number
          installment_of?: number
          institute_id?: string
          method?: string | null
          paid_date?: string | null
          receipt_no?: string | null
          status?: Database["public"]["Enums"]["fee_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_paid?: number
          batch_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          installment_no?: number
          installment_of?: number
          institute_id?: string
          method?: string | null
          paid_date?: string | null
          receipt_no?: string | null
          status?: Database["public"]["Enums"]["fee_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fees_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          attachment_url: string | null
          batch_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          institute_id: string
          subject: string | null
          title: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          institute_id?: string
          subject?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          institute_id?: string
          subject?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      institutes: {
        Row: {
          academic_year: string | null
          address: string | null
          batch_limit: number
          created_at: string
          email: string | null
          faculty_limit: number
          features: Json
          id: string
          installment_plan: Json
          logo_url: string | null
          name: string
          parent_institute_id: string | null
          phone: string | null
          plan: string
          primary_color: string | null
          receipt_template: string | null
          room_limit: number
          shifts: Json
          slug: string
          staff_login_limit: number
          status: string
          student_limit: number
          tagline: string | null
          teacher_login_limit: number
          updated_at: string
          upi_id: string | null
          upi_name: string | null
          wa_templates: Json
        }
        Insert: {
          academic_year?: string | null
          address?: string | null
          batch_limit?: number
          created_at?: string
          email?: string | null
          faculty_limit?: number
          features?: Json
          id?: string
          installment_plan?: Json
          logo_url?: string | null
          name: string
          parent_institute_id?: string | null
          phone?: string | null
          plan?: string
          primary_color?: string | null
          receipt_template?: string | null
          room_limit?: number
          shifts?: Json
          slug: string
          staff_login_limit?: number
          status?: string
          student_limit?: number
          tagline?: string | null
          teacher_login_limit?: number
          updated_at?: string
          upi_id?: string | null
          upi_name?: string | null
          wa_templates?: Json
        }
        Update: {
          academic_year?: string | null
          address?: string | null
          batch_limit?: number
          created_at?: string
          email?: string | null
          faculty_limit?: number
          features?: Json
          id?: string
          installment_plan?: Json
          logo_url?: string | null
          name?: string
          parent_institute_id?: string | null
          phone?: string | null
          plan?: string
          primary_color?: string | null
          receipt_template?: string | null
          room_limit?: number
          shifts?: Json
          slug?: string
          staff_login_limit?: number
          status?: string
          student_limit?: number
          tagline?: string | null
          teacher_login_limit?: number
          updated_at?: string
          upi_id?: string | null
          upi_name?: string | null
          wa_templates?: Json
        }
        Relationships: [
          {
            foreignKeyName: "institutes_parent_institute_id_fkey"
            columns: ["parent_institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          course_interest: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          institute_id: string
          next_followup: string | null
          notes: string | null
          phone: string | null
          source: string | null
          stage: Database["public"]["Enums"]["lead_stage"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          course_interest?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          institute_id?: string
          next_followup?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          course_interest?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          institute_id?: string
          next_followup?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          created_by: string | null
          fee_id: string | null
          id: string
          institute_id: string
          kind: string
          lead_id: string | null
          message: string
          metadata: Json
          recipient_email: string | null
          recipient_name: string | null
          recipient_phone: string | null
          related_id: string | null
          related_table: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          student_id: string | null
          test_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          created_by?: string | null
          fee_id?: string | null
          id?: string
          institute_id?: string
          kind?: string
          lead_id?: string | null
          message: string
          metadata?: Json
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          related_id?: string | null
          related_table?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          student_id?: string | null
          test_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          created_by?: string | null
          fee_id?: string | null
          id?: string
          institute_id?: string
          kind?: string
          lead_id?: string | null
          message?: string
          metadata?: Json
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          related_id?: string | null
          related_table?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          student_id?: string | null
          test_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_fee_id_fkey"
            columns: ["fee_id"]
            isOneToOne: false
            referencedRelation: "fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_students: {
        Row: {
          created_at: string
          id: string
          institute_id: string
          is_primary: boolean
          parent_user_id: string
          relation: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          institute_id?: string
          is_primary?: boolean
          parent_user_id: string
          relation?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          institute_id?: string
          is_primary?: boolean
          parent_user_id?: string
          relation?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_students_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_catalog: {
        Row: {
          batch_limit: number
          contact_only: boolean
          created_at: string
          cta: string
          highlight: boolean
          id: string
          key: string
          name: string
          price_yearly: number | null
          room_limit: number
          sort_order: number
          staff_login_limit: number
          student_limit: number
          tagline: string
          teacher_login_limit: number
          updated_at: string
          visible: boolean
        }
        Insert: {
          batch_limit?: number
          contact_only?: boolean
          created_at?: string
          cta?: string
          highlight?: boolean
          id?: string
          key: string
          name: string
          price_yearly?: number | null
          room_limit?: number
          sort_order?: number
          staff_login_limit?: number
          student_limit?: number
          tagline?: string
          teacher_login_limit?: number
          updated_at?: string
          visible?: boolean
        }
        Update: {
          batch_limit?: number
          contact_only?: boolean
          created_at?: string
          cta?: string
          highlight?: boolean
          id?: string
          key?: string
          name?: string
          price_yearly?: number | null
          room_limit?: number
          sort_order?: number
          staff_login_limit?: number
          student_limit?: number
          tagline?: string
          teacher_login_limit?: number
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      plan_features: {
        Row: {
          created_at: string
          group_name: string
          id: string
          label: string
          sort_order: number
          updated_at: string
          values: Json
        }
        Insert: {
          created_at?: string
          group_name?: string
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
          values?: Json
        }
        Update: {
          created_at?: string
          group_name?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
          values?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_institute_id: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active_institute_id?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active_institute_id?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_institute_id_fkey"
            columns: ["active_institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number
          created_at: string
          id: string
          institute_id: string
          is_active: boolean
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          institute_id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          institute_id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      student_device_ids: {
        Row: {
          created_at: string
          id: string
          institute_id: string
          label: string | null
          student_id: string
          uid: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          institute_id: string
          label?: string | null
          student_id: string
          uid: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          institute_id?: string
          label?: string | null
          student_id?: string
          uid?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_device_ids_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_device_ids_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_invites: {
        Row: {
          claimed_by: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          institute_id: string
          kind: string
          relation: string | null
          student_id: string
          token: string
          updated_at: string
          used_at: string | null
        }
        Insert: {
          claimed_by?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          institute_id: string
          kind?: string
          relation?: string | null
          student_id: string
          token?: string
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          claimed_by?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          institute_id?: string
          kind?: string
          relation?: string | null
          student_id?: string
          token?: string
          updated_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_invites_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_invites_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          aadhaar_edited_fields: string[]
          aadhaar_hash: string | null
          aadhaar_last4: string | null
          aadhaar_verified_at: string | null
          address: string | null
          admission_date: string
          admission_no: string
          approval_status: string
          batch_id: string | null
          class: string | null
          created_at: string
          discount: number
          dob: string | null
          email: string | null
          father_name: string | null
          father_phone: string | null
          full_name: string
          id: string
          institute_id: string
          intent: string
          mother_name: string | null
          mother_phone: string | null
          notes: string | null
          onboarding_completed_at: string | null
          onboarding_token: string | null
          parent_name: string | null
          parent_phone: string | null
          phone: string | null
          photo_path: string | null
          preferred_contact: string
          program: string | null
          scholarship_percent: number
          school: string | null
          status: Database["public"]["Enums"]["student_status"]
          stream: string | null
          token_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          aadhaar_edited_fields?: string[]
          aadhaar_hash?: string | null
          aadhaar_last4?: string | null
          aadhaar_verified_at?: string | null
          address?: string | null
          admission_date?: string
          admission_no: string
          approval_status?: string
          batch_id?: string | null
          class?: string | null
          created_at?: string
          discount?: number
          dob?: string | null
          email?: string | null
          father_name?: string | null
          father_phone?: string | null
          full_name: string
          id?: string
          institute_id?: string
          intent?: string
          mother_name?: string | null
          mother_phone?: string | null
          notes?: string | null
          onboarding_completed_at?: string | null
          onboarding_token?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          phone?: string | null
          photo_path?: string | null
          preferred_contact?: string
          program?: string | null
          scholarship_percent?: number
          school?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          stream?: string | null
          token_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          aadhaar_edited_fields?: string[]
          aadhaar_hash?: string | null
          aadhaar_last4?: string | null
          aadhaar_verified_at?: string | null
          address?: string | null
          admission_date?: string
          admission_no?: string
          approval_status?: string
          batch_id?: string | null
          class?: string | null
          created_at?: string
          discount?: number
          dob?: string | null
          email?: string | null
          father_name?: string | null
          father_phone?: string | null
          full_name?: string
          id?: string
          institute_id?: string
          intent?: string
          mother_name?: string | null
          mother_phone?: string | null
          notes?: string | null
          onboarding_completed_at?: string | null
          onboarding_token?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          phone?: string | null
          photo_path?: string | null
          preferred_contact?: string
          program?: string | null
          scholarship_percent?: number
          school?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          stream?: string | null
          token_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      syllabus_chapters: {
        Row: {
          batch_id: string
          completed_by: string | null
          completed_on: string | null
          created_at: string
          id: string
          institute_id: string
          planned_sessions: number
          position: number
          started_on: string | null
          status: string
          subject: string
          title: string
          updated_at: string
        }
        Insert: {
          batch_id: string
          completed_by?: string | null
          completed_on?: string | null
          created_at?: string
          id?: string
          institute_id?: string
          planned_sessions?: number
          position?: number
          started_on?: string | null
          status?: string
          subject: string
          title: string
          updated_at?: string
        }
        Update: {
          batch_id?: string
          completed_by?: string | null
          completed_on?: string | null
          created_at?: string
          id?: string
          institute_id?: string
          planned_sessions?: number
          position?: number
          started_on?: string | null
          status?: string
          subject?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "syllabus_chapters_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_chapters_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      syllabus_logs: {
        Row: {
          batch_id: string | null
          chapter_id: string
          created_at: string
          created_by: string | null
          date: string
          faculty_id: string | null
          id: string
          institute_id: string
          note: string | null
          slot_id: string | null
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          chapter_id: string
          created_at?: string
          created_by?: string | null
          date?: string
          faculty_id?: string | null
          id?: string
          institute_id?: string
          note?: string | null
          slot_id?: string | null
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          chapter_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          faculty_id?: string | null
          id?: string
          institute_id?: string
          note?: string | null
          slot_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "syllabus_logs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_logs_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "syllabus_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_logs_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_logs_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_logs_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "timetable_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          created_at: string
          id: string
          institute_id: string
          marks: number | null
          remarks: string | null
          student_id: string
          test_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          institute_id?: string
          marks?: number | null
          remarks?: string | null
          student_id: string
          test_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          institute_id?: string
          marks?: number | null
          remarks?: string | null
          student_id?: string
          test_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_results_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          batch_id: string | null
          created_at: string
          created_by: string | null
          date: string
          id: string
          institute_id: string
          max_marks: number
          status: Database["public"]["Enums"]["test_status"]
          subject: string | null
          title: string
          type: Database["public"]["Enums"]["test_type"]
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          institute_id?: string
          max_marks?: number
          status?: Database["public"]["Enums"]["test_status"]
          subject?: string | null
          title: string
          type?: Database["public"]["Enums"]["test_type"]
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          institute_id?: string
          max_marks?: number
          status?: Database["public"]["Enums"]["test_status"]
          subject?: string | null
          title?: string
          type?: Database["public"]["Enums"]["test_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_day_plan: {
        Row: {
          batch_id: string | null
          created_at: string
          date: string
          faculty_id: string | null
          id: string
          institute_id: string
          notes: string | null
          room_id: string | null
          slot_id: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          date: string
          faculty_id?: string | null
          id?: string
          institute_id?: string
          notes?: string | null
          room_id?: string | null
          slot_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          date?: string
          faculty_id?: string | null
          id?: string
          institute_id?: string
          notes?: string | null
          room_id?: string | null
          slot_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_day_plan_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_day_plan_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_day_plan_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_day_plan_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "timetable_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_slots: {
        Row: {
          batch_id: string | null
          created_at: string
          day_of_week: number
          end_time: string
          faculty_id: string | null
          id: string
          institute_id: string
          room: string | null
          room_id: string | null
          start_time: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          day_of_week: number
          end_time: string
          faculty_id?: string | null
          id?: string
          institute_id?: string
          room?: string | null
          room_id?: string | null
          start_time: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          day_of_week?: number
          end_time?: string
          faculty_id?: string | null
          id?: string
          institute_id?: string
          room?: string | null
          room_id?: string | null
          start_time?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_slots_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          institute_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institute_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institute_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_faculty_invite: { Args: { _token: string }; Returns: undefined }
      accept_student_invite: { Args: { _token: string }; Returns: undefined }
      approve_admission: {
        Args: { _batch_id: string; _student_id: string; _token_amount?: number }
        Returns: undefined
      }
      batch_faculty_names: {
        Args: { _batch_id: string }
        Returns: {
          full_name: string
          id: string
        }[]
      }
      can_read_student_photo: { Args: { _path: string }; Returns: boolean }
      collect_fee_payment: {
        Args: {
          _fee_id: string
          _method?: string
          _note?: string
          _received: number
        }
        Returns: undefined
      }
      complete_student_onboarding: {
        Args: {
          _address: string
          _class: string
          _dob?: string
          _email: string
          _father_name?: string
          _father_phone?: string
          _full_name: string
          _mother_name?: string
          _mother_phone?: string
          _parent_name: string
          _parent_phone: string
          _phone: string
          _photo_path?: string
          _preferred_contact?: string
          _program?: string
          _school: string
          _stream?: string
          _token: string
        }
        Returns: undefined
      }
      create_institute_with_owner: {
        Args: { _name: string; _tagline?: string }
        Returns: string
      }
      current_institute_id: { Args: never; Returns: string }
      default_institute_id: { Args: never; Returns: string }
      get_dashboard_overview: { Args: never; Returns: Json }
      get_faculty_invite: {
        Args: { _token: string }
        Returns: {
          full_name: string
          institute_name: string
          subject: string
          valid: boolean
        }[]
      }
      get_institute_usage: { Args: { _institute_id?: string }; Returns: Json }
      get_my_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      get_student_by_token: {
        Args: { _token: string }
        Returns: {
          address: string
          admission_no: string
          class: string
          dob: string
          email: string
          father_name: string
          father_phone: string
          full_name: string
          id: string
          mother_name: string
          mother_phone: string
          onboarding_completed_at: string
          parent_name: string
          parent_phone: string
          phone: string
          preferred_contact: string
          program: string
          school: string
          stream: string
        }[]
      }
      get_student_invite: {
        Args: { _token: string }
        Returns: {
          institute_name: string
          kind: string
          student_name: string
          valid: boolean
        }[]
      }
      group_overview: {
        Args: never
        Returns: {
          batches: number
          billed: number
          collected: number
          institute_id: string
          is_branch: boolean
          name: string
          students: number
        }[]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_my_student: { Args: { _student_id: string }; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      mark_attendance_notified: { Args: { _ids: string[] }; Returns: undefined }
      my_batch_ids: { Args: never; Returns: string[] }
      my_faculty_batch_ids: { Args: never; Returns: string[] }
      my_institute_ids: { Args: never; Returns: string[] }
      my_institutes: {
        Args: never
        Returns: {
          id: string
          is_active: boolean
          name: string
          parent_institute_id: string
        }[]
      }
      platform_institute_detail: {
        Args: { _institute_id: string }
        Returns: {
          extra: string
          id: string
          kind: string
          subtitle: string
          title: string
        }[]
      }
      platform_institutes: {
        Args: never
        Returns: {
          batch_limit: number
          batches: number
          faculty: number
          faculty_limit: number
          features: Json
          id: string
          installment_plan: Json
          name: string
          parent_institute_id: string
          plan: string
          room_limit: number
          rooms: number
          slug: string
          staff_login_limit: number
          staff_logins: number
          status: string
          student_limit: number
          students: number
          teacher_login_limit: number
          teacher_logins: number
        }[]
      }
      platform_update_institute: {
        Args: {
          _batch_limit: number
          _clear_parent?: boolean
          _faculty_limit: number
          _features: Json
          _id: string
          _installment_plan: Json
          _parent_institute_id?: string
          _plan: string
          _receipt_template?: string
          _room_limit: number
          _staff_login_limit: number
          _student_limit: number
          _teacher_login_limit: number
        }
        Returns: undefined
      }
      process_faculty_salaries: {
        Args: { _date?: string; _institute_id: string }
        Returns: undefined
      }
      reorder_syllabus_chapters: {
        Args: { _ids: string[] }
        Returns: undefined
      }
      set_active_institute: {
        Args: { _institute_id: string }
        Returns: undefined
      }
      set_student_approval: {
        Args: { _decision: string; _student_id: string }
        Returns: undefined
      }
      submit_admission_application:
        | {
            Args: {
              _address: string
              _class: string
              _dob: string
              _email: string
              _father_name: string
              _father_phone: string
              _full_name: string
              _institute_slug?: string
              _intent: string
              _mother_name: string
              _mother_phone: string
              _phone: string
              _photo_path: string
              _preferred_contact: string
              _program: string
              _school: string
              _stream: string
              _token_amount: number
            }
            Returns: string
          }
        | {
            Args: {
              _aadhaar_edited_fields?: string[]
              _aadhaar_hash?: string
              _aadhaar_last4?: string
              _aadhaar_verified?: boolean
              _address: string
              _class: string
              _dob: string
              _email: string
              _father_name: string
              _father_phone: string
              _full_name: string
              _institute_slug?: string
              _intent: string
              _mother_name: string
              _mother_phone: string
              _phone: string
              _photo_path: string
              _preferred_contact: string
              _program: string
              _school: string
              _stream: string
              _token_amount: number
            }
            Returns: string
          }
      sync_student_batch_fee: {
        Args: { _student_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "owner"
        | "admin"
        | "faculty"
        | "receptionist"
        | "counsellor"
        | "accountant"
        | "student"
        | "parent"
        | "superadmin"
      attendance_status: "present" | "absent" | "late" | "excused"
      automation_trigger:
        | "attendance_absent"
        | "fee_paid"
        | "fee_due"
        | "marks_uploaded"
        | "lead_followup"
        | "birthday"
        | "manual"
      batch_status: "active" | "upcoming" | "completed" | "cancelled"
      fee_status:
        | "pending"
        | "partial"
        | "paid"
        | "overdue"
        | "waived"
        | "cancelled"
      lead_stage:
        | "new"
        | "contacted"
        | "visit_scheduled"
        | "demo"
        | "negotiation"
        | "enrolled"
        | "lost"
      notification_channel: "whatsapp" | "sms" | "email" | "push" | "in_app"
      notification_status: "draft" | "queued" | "sent" | "delivered" | "failed"
      student_status: "active" | "inactive" | "alumni" | "dropped"
      test_status: "scheduled" | "ongoing" | "completed" | "cancelled"
      test_type: "quiz" | "unit" | "midterm" | "final" | "mock" | "practice"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "owner",
        "admin",
        "faculty",
        "receptionist",
        "counsellor",
        "accountant",
        "student",
        "parent",
        "superadmin",
      ],
      attendance_status: ["present", "absent", "late", "excused"],
      automation_trigger: [
        "attendance_absent",
        "fee_paid",
        "fee_due",
        "marks_uploaded",
        "lead_followup",
        "birthday",
        "manual",
      ],
      batch_status: ["active", "upcoming", "completed", "cancelled"],
      fee_status: [
        "pending",
        "partial",
        "paid",
        "overdue",
        "waived",
        "cancelled",
      ],
      lead_stage: [
        "new",
        "contacted",
        "visit_scheduled",
        "demo",
        "negotiation",
        "enrolled",
        "lost",
      ],
      notification_channel: ["whatsapp", "sms", "email", "push", "in_app"],
      notification_status: ["draft", "queued", "sent", "delivered", "failed"],
      student_status: ["active", "inactive", "alumni", "dropped"],
      test_status: ["scheduled", "ongoing", "completed", "cancelled"],
      test_type: ["quiz", "unit", "midterm", "final", "mock", "practice"],
    },
  },
} as const
