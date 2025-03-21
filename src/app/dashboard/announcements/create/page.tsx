"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { College } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  Globe,
  Image as ImageIcon,
  Link,
  HelpCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";

type LinkItem = {
  title: string;
  url: string;
};

type MediaItem = {
  type: "image" | "video" | "file";
  url: string;
  file?: File;
};

export default function CreateAnnouncementPage() {
  const { profile, isLoading } = useAuth();
  const router = useRouter();
  const [promoCode, setPromoCode] = useState("");
  const [promoDescription, setPromoDescription] = useState("");
  const [colleges, setColleges] = useState<College[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isGlobal, setIsGlobal] = useState(false);
  const [selectedColleges, setSelectedColleges] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [expiresDate, setExpiresDate] = useState("");
  const [links, setLinks] = useState<LinkItem[]>([{ title: "", url: "" }]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch colleges
  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const { data, error } = await supabase
          .from("colleges")
          .select("*")
          .order("name");

        if (error) throw error;

        setColleges(data || []);
      } catch (err) {
        console.error("Error fetching colleges:", err);
        setError("Failed to load colleges. Please try again.");
      }
    };

    fetchColleges();
  }, []);

  // Redirect if not an admin
  useEffect(() => {
    if (!isLoading && profile && profile.role !== "admin") {
      router.push("/dashboard");
    }
  }, [isLoading, profile, router]);

  if (isLoading) {
    return <div className="text-center p-8 text-black">Loading...</div>;
  }

  if (!profile || profile.role !== "admin") {
    return null;
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!content.trim()) {
      setError("Content is required");
      return;
    }

    if (!isGlobal && selectedColleges.length === 0) {
      setError(
        "Please select at least one college or make the announcement global"
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Convert college IDs to UUID array
      const collegeIds = selectedColleges.map((id) => id);

      // Call the function to create the announcement
      const { data: announcementResult, error: functionError } =
      await supabase.rpc("create_multi_college_announcement", {
        p_title: title,
        p_content: content,
        p_creator_id: profile.id,
        p_college_ids: isGlobal ? [] : collegeIds,
        p_is_global: isGlobal,
        p_has_media: media.length > 0,
        p_is_active: true,
        p_is_pinned: isPinned,
        p_scheduled_at: scheduledDate
          ? new Date(scheduledDate).toISOString()
          : null,
        p_expires_at: expiresDate
          ? new Date(expiresDate).toISOString()
          : null,
        p_target_audience: ["all"],
        p_has_promo: promoCode.trim() !== "",
        p_promo_code: promoCode.trim() || null,
        p_promo_description: promoDescription.trim() || null
      });

      if (functionError) {
        throw functionError;
      }

      const announcementId = announcementResult;

      // Upload any media files
      for (let i = 0; i < media.length; i++) {
        const item = media[i];

        if (item.file) {
          // Upload the file to storage
          const fileName = `${announcementId}/${Date.now()}-${item.file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("announcement-media")
            .upload(fileName, item.file);

          if (uploadError) {
            throw uploadError;
          }

          // Get the public URL
          const { data: urlData } = supabase.storage
            .from("announcement-media")
            .getPublicUrl(fileName);

          const publicUrl = urlData.publicUrl;

          // Save the media reference
          const { error: mediaError } = await supabase
            .from("announcement_media")
            .insert({
              announcement_id: announcementId,
              media_type: item.type,
              media_url: publicUrl,
              display_order: i,
            });

          if (mediaError) {
            throw mediaError;
          }
        }
      }

      // Save any links
      const validLinks = links.filter(
        (link) => link.title.trim() && link.url.trim()
      );

      if (validLinks.length > 0) {
        const { error: linksError } = await supabase
          .from("announcement_links")
          .insert(
            validLinks.map((link, index) => ({
              announcement_id: announcementId,
              link_title: link.title,
              link_url: link.url,
              display_order: index,
            }))
          );

        if (linksError) {
          throw linksError;
        }
      }

      toast({
        title: "Announcement Created",
        description:
          "Your announcement has been successfully created and notifications sent.",
      });

      router.push("/dashboard/announcements");
    } catch (err) {
      console.error("Error creating announcement:", err);
      setError("Failed to create announcement. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const fileType = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
        ? "video"
        : "file";

      setMedia([
        ...media,
        {
          type: fileType as "image" | "video" | "file",
          url: URL.createObjectURL(file),
          file,
        },
      ]);
    }
  };

  // Add link field
  const addLinkField = () => {
    setLinks([...links, { title: "", url: "" }]);
  };

  // Remove link field
  const removeLinkField = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  // Update link field
  const updateLinkField = (
    index: number,
    field: "title" | "url",
    value: string
  ) => {
    const newLinks = [...links];
    newLinks[index][field] = value;
    setLinks(newLinks);
  };

  // Remove media item
  const removeMediaItem = (index: number) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  return (
    <div className="container mx-auto py-6 text-black">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/announcements")}
          className="mr-2 text-black"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-black">
          Create New Announcement
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md border border-red-300 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <Card className="text-black">
        <CardHeader>
          <CardTitle className="text-black">Announcement Details</CardTitle>
          <CardDescription className="text-black">
            Create a new announcement that will be sent to users as a
            notification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-black">
                  Title
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Announcement title"
                  required
                  className="text-black"
                />
              </div>

              <div>
                <Label htmlFor="content" className="text-black">
                  Content
                </Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter the announcement content..."
                  rows={5}
                  required
                  className="text-black"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="scheduled" className="text-black">
                    Schedule Date (Optional)
                  </Label>
                  <div className="flex">
                    <Input
                      id="scheduled"
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="text-black"
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" type="button">
                            <HelpCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-black">
                          <p>
                            If set, the announcement will not be visible until
                            this date
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="expires" className="text-black">
                    Expiry Date (Optional)
                  </Label>
                  <div className="flex">
                    <Input
                      id="expires"
                      type="datetime-local"
                      value={expiresDate}
                      onChange={(e) => setExpiresDate(e.target.value)}
                      className="text-black"
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" type="button">
                            <HelpCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-black">
                          <p>
                            If set, the announcement will not be visible after
                            this date
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>

              <div className="border p-4 rounded-md space-y-4">
                <div className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <h3 className="text-lg font-medium text-black">Audience</h3>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isGlobal"
                    checked={isGlobal}
                    onCheckedChange={(checked) => setIsGlobal(checked === true)}
                  />
                  <Label htmlFor="isGlobal" className="font-normal text-black">
                    Send to all colleges (Global announcement)
                  </Label>
                </div>

                {!isGlobal && (
                  <div>
                    <Label className="text-black">Select Colleges</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                      {colleges.map((college) => (
                        <div
                          key={college.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`college-${college.id}`}
                            checked={selectedColleges.includes(college.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedColleges([
                                  ...selectedColleges,
                                  college.id,
                                ]);
                              } else {
                                setSelectedColleges(
                                  selectedColleges.filter(
                                    (id) => id !== college.id
                                  )
                                );
                              }
                            }}
                          />
                          <Label
                            htmlFor={`college-${college.id}`}
                            className="font-normal text-black"
                          >
                            {college.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border p-4 rounded-md space-y-4">
                <div className="flex items-center space-x-2">
                  <Link className="h-5 w-5" />
                  <h3 className="text-lg font-medium text-black">Links</h3>
                </div>

                {links.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Link title"
                      value={link.title}
                      onChange={(e) =>
                        updateLinkField(index, "title", e.target.value)
                      }
                      className="flex-1 text-black"
                    />
                    <Input
                      placeholder="URL"
                      value={link.url}
                      onChange={(e) =>
                        updateLinkField(index, "url", e.target.value)
                      }
                      className="flex-1 text-black"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLinkField(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addLinkField}
                  className="w-full text-black"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Link
                </Button>
              </div>

              <div className="border p-4 rounded-md space-y-4">
                <div className="flex items-center space-x-2">
                  <ImageIcon className="h-5 w-5" />
                  <h3 className="text-lg font-medium text-black">Media</h3>
                </div>

                {media.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {media.map((item, index) => (
                      <div
                        key={index}
                        className="relative rounded-md overflow-hidden border"
                      >
                        {item.type === "image" && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.url}
                            alt={`Preview of uploaded ${item.file?.name || 'image'}`}
                            className="w-full h-32 object-cover"
                          />
                        )}
                        {item.type === "video" && (
                          <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                            <span className="text-black">Video File</span>
                          </div>
                        )}
                        {item.type === "file" && (
                          <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                            <span className="text-black">Document File</span>
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => removeMediaItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Input
                    type="file"
                    id="media-upload"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,video/*,application/pdf,application/msword"
                  />
                  <Label
                    htmlFor="media-upload"
                    className="cursor-pointer flex items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-md p-4"
                  >
                    <div className="flex flex-col items-center">
                      <ImageIcon
                        className="h-6 w-6 mb-2"
                        aria-hidden="true"
                      />{" "}
                      <span className="text-sm text-black">
                        Click to upload an image, video, or file
                      </span>
                    </div>
                  </Label>
                </div>
              </div>

              <div className="border p-4 rounded-md space-y-4">
  <div className="flex items-center space-x-2">
    <span className="h-5 w-5 flex items-center justify-center font-bold">%</span>
    <h3 className="text-lg font-medium text-black">Promo Code</h3>
  </div>
  
  <div className="space-y-4">
    <div>
      <Label htmlFor="promoCode" className="text-black">
        Promo Code (Optional)
      </Label>
      <Input
        id="promoCode"
        value={promoCode}
        onChange={(e) => setPromoCode(e.target.value)}
        placeholder="Enter promo code"
        className="text-black"
      />
    </div>
    
    <div>
      <Label htmlFor="promoDescription" className="text-black">
        Promo Description (Optional)
      </Label>
      <Textarea
        id="promoDescription"
        value={promoDescription}
        onChange={(e) => setPromoDescription(e.target.value)}
        placeholder="Describe what this promo code offers..."
        rows={2}
        className="text-black"
      />
    </div>
  </div>
</div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPinned"
                  checked={isPinned}
                  onCheckedChange={(checked) => setIsPinned(checked === true)}
                />
                <Label htmlFor="isPinned" className="font-normal text-black">
                  Pin this announcement
                </Label>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/announcements")}
                disabled={isSubmitting}
                className="text-black"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="text-white"
              >
                {isSubmitting ? "Creating..." : "Create Announcement"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}