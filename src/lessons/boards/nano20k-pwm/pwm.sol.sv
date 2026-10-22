module pwm #(parameter WIDTH = 4) (
  input clk,
  input rst_n,
  input [WIDTH-1:0] duty,
  output reg led
);
  reg [WIDTH-1:0] count;
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      count <= 0;
      led <= 1'b1;
    end else begin
      count <= count + 1'b1;
      led <= (count < duty) ? 1'b0 : 1'b1;
    end
  end
endmodule
