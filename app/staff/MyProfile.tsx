
"use client";

type Profile = {
  first_name: string | null;
  surname: string | null;
  role: string;
  avatar_url: string | null;
  team_code: string | null;
};

type SuperAdminProfile = {
  first_name: string | null;
  surname: string | null;
  team_code: string | null;
};

type Props = {
  profile: Profile;
  superAdmin: SuperAdminProfile | null;
};

export default function MyProfile({ profile, superAdmin }: Props) {
  const fullName = [profile.first_name, profile.surname]
    .filter(Boolean)
    .join(" ") || "Staff Member";

  const superAdminName = superAdmin
    ? [superAdmin.first_name, superAdmin.surname]
        .filter(Boolean)
        .join(" ")
    : "Not assigned";

  const rowStyle = {
    padding: "14px",
    background: "#22262d",
    border: "1px solid #363c46",
    borderRadius: "9px",
    marginTop: "10px",
  };

  return (
    <div
      style={{
        background: "#17191d",
        border: "1px solid #30343b",
        borderRadius: "14px",
        padding: "28px",
        color: "#f1f3f5",
      }}
    >
      <div style={{ color: "#aeb4bd", fontSize: "13px" }}>
        STAFF ACCOUNT
      </div>

      <h2 style={{ fontSize: "24px", margin: "10px 0 22px" }}>
        My Profile
      </h2>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div
          style={{
            width: "76px",
            height: "76px",
            minWidth: "76px",
            borderRadius: "50%",
            overflow: "hidden",
            background: "#343a44",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Staff profile"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ fontSize: "25px" }}>
              {fullName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div>
          <div style={{ fontSize: "19px", fontWeight: 600 }}>
            {fullName}
          </div>
          <div style={{ color: "#aeb4bd", fontSize: "13px" }}>
            Staff
          </div>
        </div>
      </div>

      <h3 style={{ marginTop: "28px", fontSize: "16px" }}>
        Account Information
      </h3>

      <div style={rowStyle}>
        <div style={{ color: "#aeb4bd", fontSize: "12px" }}>First Name</div>
        <div>{profile.first_name || "Not provided"}</div>
      </div>

      <div style={rowStyle}>
        <div style={{ color: "#aeb4bd", fontSize: "12px" }}>Surname</div>
        <div>{profile.surname || "Not provided"}</div>
      </div>

      <div style={rowStyle}>
        <div style={{ color: "#aeb4bd", fontSize: "12px" }}>Role</div>
        <div>Staff</div>
      </div>

      <div style={rowStyle}>
        <div style={{ color: "#aeb4bd", fontSize: "12px" }}>Team Code</div>
        <div>{profile.team_code || "Not assigned"}</div>
      </div>

      <h3 style={{ marginTop: "28px", fontSize: "16px" }}>
        Reporting Super Admin
      </h3>

      <div style={rowStyle}>
        <div style={{ color: "#aeb4bd", fontSize: "12px" }}>Super Admin Name</div>
        <div>{superAdminName}</div>
      </div>

      <div style={rowStyle}>
        <div style={{ color: "#aeb4bd", fontSize: "12px" }}>Super Admin Team Code</div>
        <div>{superAdmin?.team_code || "Not assigned"}</div>
      </div>

      <p style={{ color: "#aeb4bd", fontSize: "12px", marginTop: "20px" }}>
        Profile editing ke liye upar header mein Edit Profile option use karein.
      </p>
    </div>
  );
}
