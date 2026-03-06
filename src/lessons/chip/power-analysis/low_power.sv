module low_power(
  input        clk, reset, enable,
  input  [7:0] data_in,
  output reg [7:0] data_out
);
  // TODO: only update data_out when enable is high
  // Use clock gating or conditional assignment to save power
  always @(posedge clk) begin
    if (reset)
      data_out <= 8'b0;
    else
      data_out <= data_in; // always updating - wasteful!
  end
endmodule
