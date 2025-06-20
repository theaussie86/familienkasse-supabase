import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string; message: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Ups, etwas ist schiefgelaufen.
              </CardTitle>
            </CardHeader>
            <CardContent>
              {params?.error ? (
                <p className="text-sm text-muted-foreground">
                  Fehlercode: {params.error}
                </p>
              ) : params.message === "unauthorized" ? (
                <p className="text-sm text-muted-foreground">
                  Du bist nicht berechtigt, dich mit GitHub anzumelden.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ein unbekannter Fehler ist aufgetreten.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
