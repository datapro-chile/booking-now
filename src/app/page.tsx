"use client";

import { useState, useEffect } from "react";
import { signIn, getSession, getCsrfToken, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export default function Home() {
  const [email, setEmail] = useState("admin@booking-now.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (status === "loading") return;

    // Mostrar notificación si viene de logout
    const loggedOut = searchParams.get('logout');
    if (loggedOut === 'true' && !session) {
      showSuccess("Sesión cerrada exitosamente");
      // Limpiar el parámetro de la URL
      const url = new URL(window.location.href);
      url.searchParams.delete('logout');
      window.history.replaceState({}, '', url.toString());
    }

    if (session) {
      // Si el usuario está logueado, redirigir según su rol
      if (session.user?.role === "ADMIN") {
        router.push("/admin");
      } else if (session.user?.isTenant) {
        router.push("/tenant");
      }
    }
  }, [session, status, router, searchParams, showSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const csrfToken = await getCsrfToken();
      
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
        csrfToken
      });

      if (result?.error) {
        setError("Credenciales inválidas. Verifica tu email y contraseña.");
        showError("Error al iniciar sesión");
      } else if (result?.ok) {
        showSuccess("Inicio de sesión exitoso");
        const session = await getSession();
        
        if (session?.user?.role === "ADMIN") {
          router.push("/admin");
        } else if (session?.user?.isTenant) {
          router.push("/tenant");
        } else {
          router.push("/");
        }
      } else {
        setError("Error desconocido al iniciar sesión");
        showError("Error desconocido al iniciar sesión");
      }
    } catch (error) {
      console.error("💥 Login error:", error);
      setError("Error al iniciar sesión");
      showError("Error de conexión al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Si ya hay sesión, el useEffect manejará la redirección
  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl font-bold">B</span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            BookingNow
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Inicia sesión para acceder al panel de administración
          </p>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-700">
              <strong>Credenciales de prueba:</strong><br />
              Email: admin@booking-now.com<br />
              Contraseña: admin123
            </p>
          </div>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1"
              placeholder="admin@booking-now.com"
            />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative mt-1">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </Button>
        </form>
      </div>
    </div>
  );
}
