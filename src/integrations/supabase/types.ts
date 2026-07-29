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
          remarks: string | null
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
          remarks?: string | null
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
          remarks?: string | null
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
      automation_rules: {
        Row: {
          action: Json
          channel: Database["public"]["Enums"]["notification_channel"]
          condition: Json
          created_at: string
          created_by: string | null
          delay_minutes: number
          id: string
          institute_id: string
          is_active: boolean
          name: string
          trigger_key: Database["public"]["Enums"]["automation_trigger"]
          updated_at: string
        }
        Insert: {
          action?: Json
          channel?: Database["public"]["Enums"]["notification_channel"]
          condition?: Json
          created_at?: string
          created_by?: string | null
          delay_minutes?: number
          id?: string
          institute_id?: string
          is_active?: boolean
          name: string
          trigger_key: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
        }
        Update: {
          action?: Json
          channel?: Database["public"]["Enums"]["notification_channel"]
          condition?: Json
          created_at?: string
          created_by?: string | null
          delay_minutes?: number
          id?: string
          institute_id?: string
          is_active?: boolean
          name?: string
          trigger_key?: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_institute_id_fkey"
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
          course_id: string | null
          created_at: string
          default_fee: number
          end_date: string | null
          faculty_id: string | null
          id: string
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
          course_id?: string | null
          created_at?: string
          default_fee?: number
          end_date?: string | null
          faculty_id?: string | null
          id?: string
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
          course_id?: string | null
          created_at?: string
          default_fee?: number
          end_date?: string | null
          faculty_id?: string | null
          id?: string
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
            foreignKeyName: "batches_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          institute_id: string
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          institute_id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          institute_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty: {
        Row: {
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
      fees: {
        Row: {
          amount: number
          amount_paid: number
          batch_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
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
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          plan: string
          primary_color: string | null
          shifts: Json
          slug: string
          status: string
          tagline: string | null
          updated_at: string
          upi_id: string | null
          upi_name: string | null
        }
        Insert: {
          academic_year?: string | null
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          plan?: string
          primary_color?: string | null
          shifts?: Json
          slug: string
          status?: string
          tagline?: string | null
          updated_at?: string
          upi_id?: string | null
          upi_name?: string | null
        }
        Update: {
          academic_year?: string | null
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          plan?: string
          primary_color?: string | null
          shifts?: Json
          slug?: string
          status?: string
          tagline?: string | null
          updated_at?: string
          upi_id?: string | null
          upi_name?: string | null
        }
        Relationships: []
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
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
      student_activities: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          fee_id: string | null
          id: string
          institute_id: string
          lead_id: string | null
          metadata: Json
          source: Database["public"]["Enums"]["activity_source"]
          student_id: string | null
          test_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fee_id?: string | null
          id?: string
          institute_id?: string
          lead_id?: string | null
          metadata?: Json
          source?: Database["public"]["Enums"]["activity_source"]
          student_id?: string | null
          test_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fee_id?: string | null
          id?: string
          institute_id?: string
          lead_id?: string | null
          metadata?: Json
          source?: Database["public"]["Enums"]["activity_source"]
          student_id?: string | null
          test_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_activities_fee_id_fkey"
            columns: ["fee_id"]
            isOneToOne: false
            referencedRelation: "fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_activities_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_activities_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_activities_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      student_documents: {
        Row: {
          category: string
          created_at: string
          file_path: string
          file_size: number | null
          id: string
          institute_id: string
          lead_id: string | null
          mime_type: string | null
          notes: string | null
          student_id: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          file_path: string
          file_size?: number | null
          id?: string
          institute_id?: string
          lead_id?: string | null
          mime_type?: string | null
          notes?: string | null
          student_id: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          file_path?: string
          file_size?: number | null
          id?: string
          institute_id?: string
          lead_id?: string | null
          mime_type?: string | null
          notes?: string | null
          student_id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_documents_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
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
      subjects: {
        Row: {
          code: string | null
          course_id: string | null
          created_at: string
          id: string
          institute_id: string
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          institute_id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          institute_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
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
          institute_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institute_id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institute_id?: string
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
      approve_admission: {
        Args: { _batch_id: string; _student_id: string; _token_amount?: number }
        Returns: undefined
      }
      complete_student_onboarding:
        | {
            Args: {
              _address: string
              _class: string
              _email: string
              _full_name: string
              _parent_name: string
              _parent_phone: string
              _phone: string
              _school: string
              _token: string
            }
            Returns: string
          }
        | {
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
      current_institute_id: { Args: never; Returns: string }
      default_institute_id: { Args: never; Returns: string }
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
      my_batch_ids: { Args: never; Returns: string[] }
      my_faculty_batch_ids: { Args: never; Returns: string[] }
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
              _mother_name: string
              _mother_phone: string
              _phone: string
              _photo_path: string
              _preferred_contact?: string
              _program: string
              _school: string
              _stream: string
            }
            Returns: string
          }
        | {
            Args: {
              _address: string
              _class: string
              _dob: string
              _email: string
              _father_name: string
              _father_phone: string
              _full_name: string
              _intent?: string
              _mother_name: string
              _mother_phone: string
              _phone: string
              _photo_path: string
              _preferred_contact?: string
              _program: string
              _school: string
              _stream: string
              _token_amount?: number
            }
            Returns: string
          }
      sync_student_batch_fee: {
        Args: { _student_id: string }
        Returns: undefined
      }
    }
    Enums: {
      activity_source:
        | "admissions"
        | "attendance"
        | "fees"
        | "tests"
        | "documents"
        | "automation"
        | "manual"
      app_role:
        | "owner"
        | "admin"
        | "faculty"
        | "receptionist"
        | "counsellor"
        | "accountant"
        | "student"
        | "parent"
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
      fee_status: "pending" | "partial" | "paid" | "overdue" | "waived"
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
      activity_source: [
        "admissions",
        "attendance",
        "fees",
        "tests",
        "documents",
        "automation",
        "manual",
      ],
      app_role: [
        "owner",
        "admin",
        "faculty",
        "receptionist",
        "counsellor",
        "accountant",
        "student",
        "parent",
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
      fee_status: ["pending", "partial", "paid", "overdue", "waived"],
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
