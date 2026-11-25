using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text.RegularExpressions;

var builder = DistributedApplication.CreateBuilder(args);

const int apiPort = 4200;
const int grafanaPort = 3000;
const int otlpHttpPort = 4318;
const string appEnvironment = "development";
const string defaultAuthIssuerBaseUrl = "https://identity-beta.adammajor.com";
const string defaultAuthClientId = "client_ASCACaC-QT2cM8DmF2IroxFe";
const string defaultOAuthScopes =
    "openid profile email offline_access relationships:read relationships:create relationships:invite relationships:accept-invite payment-requests:read payment-requests:write";

var authIssuerBaseUrl =
    builder.Configuration["AUTH_ISSUER_BASE_URL"]?.Trim().TrimEnd('/')
    ?? defaultAuthIssuerBaseUrl;
var authAudience =
    builder.Configuration["AUTH_AUDIENCE"]?.Trim()
    ?? $"{authIssuerBaseUrl}/resources/api";
var authClientId =
    builder.Configuration["AUTH_CLIENT_ID"]?.Trim() ?? defaultAuthClientId;
var authRequiredScopes = builder.Configuration["AUTH_REQUIRED_SCOPES"] ?? "";
var apiLogLevel = builder.Configuration["LOG_LEVEL"] ?? "debug";
var mobileLogLevel = builder.Configuration["EXPO_PUBLIC_LOG_LEVEL"] ?? "debug";
var corsOrigin =
    builder.Configuration["CORS_ORIGIN"] ?? "http://localhost:8081";
var oauthScopes =
    builder.Configuration["EXPO_PUBLIC_OAUTH_SCOPES"] ?? defaultOAuthScopes;
var oauthScheme =
    builder.Configuration["EXPO_PUBLIC_OAUTH_SCHEME"] ?? "relationshipapp";
var apiPortValue = apiPort.ToString();
var configuredApiOtlpLogsEndpoint =
    builder.Configuration["OTEL_EXPORTER_OTLP_LOGS_ENDPOINT"]?.Trim();
var configuredApiOtlpEndpoint =
    builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]?.Trim();
var apiOtlpEndpoint = string.IsNullOrWhiteSpace(configuredApiOtlpEndpoint)
    ? $"http://localhost:{otlpHttpPort}"
    : configuredApiOtlpEndpoint.TrimEnd('/');
var apiOtlpLogsEndpoint = string.IsNullOrWhiteSpace(configuredApiOtlpLogsEndpoint)
    ? $"{apiOtlpEndpoint}/v1/logs"
    : configuredApiOtlpLogsEndpoint;
var configuredMobileApiUrl =
    builder.Configuration["EXPO_PUBLIC_API_URL"]?.Trim();
var localIpv4Address = new Lazy<string>(GetLocalIpv4Address);
var mobileApiUrl = string.IsNullOrWhiteSpace(configuredMobileApiUrl)
    ? $"http://{localIpv4Address.Value}:{apiPortValue}"
    : configuredMobileApiUrl.TrimEnd('/');

var shouldSeedData = builder.AddParameter("seedData", "true");
// Node/Prisma cannot trust Aspire's local MongoDB developer certificate.
#pragma warning disable ASPIRECERTIFICATES001, ASPIREMONGODB001
var mongo = builder.AddMongoDB("mongo")
    .WithoutHttpsCertificate()
    .WithReplicaSet()
    .WithDataVolume("relationship-app-mongodb-data")
    .WithLifetime(ContainerLifetime.Persistent);
#pragma warning restore ASPIRECERTIFICATES001, ASPIREMONGODB001

var database = mongo.AddDatabase("relationship-dev", "relationship_dev");

var grafana = builder.AddContainer("grafana", "grafana/otel-lgtm", "latest")
    .WithHttpEndpoint(
        port: grafanaPort,
        targetPort: grafanaPort,
        name: "http",
        isProxied: false
    )
    .WithHttpEndpoint(
        port: otlpHttpPort,
        targetPort: otlpHttpPort,
        name: "otlp-http",
        isProxied: false
    );

var api = builder.AddExecutable("api", "npm", "../apps/api", "run", "apphost:dev")
    .WithHttpEndpoint(port: apiPort, targetPort: apiPort, name: "http", isProxied: false)
    .WithEnvironment("NODE_ENV", appEnvironment)
    .WithEnvironment("HOST", "0.0.0.0")
    .WithEnvironment("PORT", apiPortValue)
    .WithEnvironment("LOG_LEVEL", apiLogLevel)
    .WithEnvironment("OTEL_EXPORTER_OTLP_LOGS_ENDPOINT", apiOtlpLogsEndpoint)
    .WithEnvironment("CORS_ORIGIN", corsOrigin)
    .WithEnvironment("AUTH_ISSUER_BASE_URL", authIssuerBaseUrl)
    .WithEnvironment("AUTH_AUDIENCE", authAudience)
    .WithEnvironment("AUTH_CLIENT_ID", authClientId)
    .WithEnvironment("AUTH_REQUIRED_SCOPES", authRequiredScopes)
    .WithEnvironment("DATABASE_URL", database.Resource.ConnectionStringExpression)
    .WithReference(database)
    .WaitFor(database)
    .WaitFor(grafana);

var mobile = builder.AddExecutable("mobile", "npm", "../apps/mobile", "run", "apphost:dev")
    .WithEnvironment("EXPO_PUBLIC_ENV", appEnvironment)
    .WithEnvironment("EXPO_PUBLIC_API_URL", mobileApiUrl)
    .WithEnvironment("EXPO_PUBLIC_LOG_LEVEL", mobileLogLevel)
    .WithEnvironment("EXPO_PUBLIC_OTEL_LOG_RELAY_ENABLED", "true")
    .WithEnvironment("EXPO_PUBLIC_IDP_URL", authIssuerBaseUrl)
    .WithEnvironment("EXPO_PUBLIC_OAUTH_AUDIENCE", authAudience)
    .WithEnvironment("EXPO_PUBLIC_OAUTH_CLIENT_ID", authClientId)
    .WithEnvironment("EXPO_PUBLIC_OAUTH_SCOPES", oauthScopes)
    .WithEnvironment("EXPO_PUBLIC_OAUTH_SCHEME", oauthScheme)
    .WithTerminal();

if (await shouldSeedData.Resource.GetValueAsync(CancellationToken.None) == "true")
{
    var seed = builder.AddExecutable(
            "seed-dev",
            "npm",
            "../apps/api",
            "run",
            "prisma:seed:dev")
        .WithEnvironment("NODE_ENV", appEnvironment)
        .WithEnvironment("SEED_DEVELOPMENT_DATA", "true")
        .WithEnvironment(
            "SEED_DEVELOPMENT_USER_ID",
            builder.Configuration["SEED_DEVELOPMENT_USER_ID"] ?? "")
        .WithEnvironment("DATABASE_URL", database.Resource.ConnectionStringExpression)
        .WaitFor(database);

    api.WaitForCompletion(seed);
}

builder.Build().Run();

static string GetLocalIpv4Address()
{
    var networkInterfaces = NetworkInterface.GetAllNetworkInterfaces()
        .Where(networkInterface =>
            networkInterface.OperationalStatus == OperationalStatus.Up
            && networkInterface.NetworkInterfaceType is not NetworkInterfaceType.Loopback
            and not NetworkInterfaceType.Tunnel
            && !IsVirtualInterface(networkInterface))
        .OrderByDescending(IsWifiInterface);

    foreach (var networkInterface in networkInterfaces)
    {
        foreach (var address in networkInterface.GetIPProperties().UnicastAddresses)
        {
            var ipAddress = address.Address;
            if (
                ipAddress.AddressFamily == AddressFamily.InterNetwork
                && !IPAddress.IsLoopback(ipAddress)
                && !IsLinkLocalIpv4Address(ipAddress)
            )
            {
                return ipAddress.ToString();
            }
        }
    }

    throw new InvalidOperationException(
        "Could not determine a LAN IPv4 address for Expo. Set EXPO_PUBLIC_API_URL in AppHost configuration."
    );
}

static bool IsWifiInterface(NetworkInterface networkInterface)
{
    return networkInterface.NetworkInterfaceType == NetworkInterfaceType.Wireless80211
        || Regex.IsMatch(
            networkInterface.Name,
            @"^(wi-?fi|wireless|wlan)",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant
        );
}

static bool IsVirtualInterface(NetworkInterface networkInterface)
{
    return Regex.IsMatch(
        $"{networkInterface.Name} {networkInterface.Description}",
        @"(virtual|vEthernet|wsl|hyper-v|docker|vmware|virtualbox|loopback|tailscale|zerotier|vpn|tun\d*|tap\d*|bridge)",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant
    );
}

static bool IsLinkLocalIpv4Address(IPAddress address)
{
    var bytes = address.GetAddressBytes();
    return bytes[0] == 169 && bytes[1] == 254;
}
