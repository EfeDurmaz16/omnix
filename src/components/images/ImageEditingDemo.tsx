'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wand2,
  Edit3,
  Expand,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

export default function ImageEditingDemo() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      title: "1. Select an Image",
      description: "Click the edit button on any image in your gallery",
      icon: Edit3,
      status: "completed"
    },
    {
      title: "2. Choose Edit Type",
      description: "Select from Variation, Inpaint, or Outpaint",
      icon: Wand2,
      status: "active"
    },
    {
      title: "3. Enter Edit Prompt",
      description: "Describe the changes you want to make",
      icon: Edit3,
      status: "pending"
    },
    {
      title: "4. AI Processing",
      description: "DALL-E 3 generates the edited version",
      icon: Expand,
      status: "pending"
    },
    {
      title: "5. Version Created",
      description: "New version is saved and added to your gallery",
      icon: CheckCircle,
      status: "pending"
    }
  ];

  const editTypes = [
    {
      type: 'variation',
      name: 'Create Variation',
      description: 'Generate a new version with style or mood changes',
      example: 'make it more colorful, change to watercolor style, add flowers',
      icon: Wand2,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      type: 'inpaint',
      name: 'Modify Parts',
      description: 'Change specific elements within the image',
      example: 'change the background to a sunset, remove the person, add a cat',
      icon: Edit3,
      color: 'bg-green-100 text-green-600'
    },
    {
      type: 'outpaint',
      name: 'Extend Image',
      description: 'Expand the image beyond its current borders',
      example: 'extend to show more landscape, add more sky, show the full scene',
      icon: Expand,
      color: 'bg-purple-100 text-purple-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="cultural-card border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <Info className="mr-2 h-5 w-5" />
            Image Editing - How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-700">
            Our AI-powered image editing uses DALL-E 3 to create new versions of your images based on text prompts. 
            Each edit creates a new version while preserving the original.
          </p>
        </CardContent>
      </Card>

      {/* Process Steps */}
      <Card className="cultural-card">
        <CardHeader>
          <CardTitle>Editing Process</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={index}
                  className={`flex items-center space-x-4 p-4 rounded-lg border transition-colors ${
                    index === activeStep
                      ? 'border-blue-500 bg-blue-50'
                      : index < activeStep
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className={`p-2 rounded-full ${
                    index < activeStep
                      ? 'bg-green-100 text-green-600'
                      : index === activeStep
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  {index < activeStep && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
            >
              Previous
            </Button>
            <Button
              size="sm"
              onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
              disabled={activeStep === steps.length - 1}
            >
              Next Step
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Types */}
      <Card className="cultural-card">
        <CardHeader>
          <CardTitle>Available Edit Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {editTypes.map((type) => {
              const Icon = type.icon;
              return (
                <div key={type.type} className="border rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`p-2 rounded-lg ${type.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">{type.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {type.description}
                  </p>
                  <div className="bg-gray-50 p-3 rounded text-xs">
                    <span className="font-medium">Example prompts:</span>
                    <br />
                    <span className="text-muted-foreground italic">"{type.example}"</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card className="cultural-card">
        <CardHeader>
          <CardTitle>Key Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Version History Tracking</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Original Image Preservation</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Text-Based Editing Instructions</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Download Any Version</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Visual Version Comparison</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Edit Prompt History</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card className="cultural-card border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-800">Image Editing is Ready!</span>
          </div>
          <p className="text-green-700 text-sm mt-2">
            All components are implemented and integrated. Users can now edit their images with AI-powered prompts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}